#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, contracterror, token, Address, Env, String, Vec,
};

// ─── Error Codes ────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Contract has already been initialized
    AlreadyInitialized = 1,
    /// Contract has not been initialized
    NotInitialized = 2,
    /// Caller is not the contract admin
    Unauthorized = 3,
    /// Author profile already registered for this address
    AuthorAlreadyRegistered = 4,
    /// Author profile not found
    AuthorNotFound = 5,
    /// Content token not found
    ContentNotFound = 6,
    /// Insufficient payment for token-gated content
    InsufficientPayment = 7,
    /// User already has access to this content
    AlreadyHasAccess = 8,
    /// Content is not token-gated
    NotTokenGated = 9,
    /// No earnings to withdraw
    NoEarnings = 10,
    /// Invalid input parameters
    InvalidInput = 11,
    /// Tip amount must be positive
    InvalidTipAmount = 12,
}

// ─── Storage Keys ───────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Contract admin address
    Admin,
    /// Native XLM token contract address (SAC)
    NativeToken,
    /// Auto-incrementing content token counter
    NextTokenId,
    /// Content NFT metadata: DataKey::Content(token_id) -> ContentNFT
    Content(u64),
    /// Content owner: DataKey::ContentOwner(token_id) -> Address
    ContentOwner(u64),
    /// Author profile: DataKey::Author(address) -> AuthorProfile
    Author(Address),
    /// Access grant: DataKey::Access(user, token_id) -> bool
    Access(Address, u64),
    /// Author earnings balance: DataKey::Earnings(address) -> i128
    Earnings(Address),
    /// List of all content token IDs (bounded - max 1000)
    AllContentIds,
    /// List of content IDs by author: DataKey::AuthorContent(address) -> Vec<u64>
    AuthorContent(Address),
}

// ─── Data Types ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, Debug)]
pub struct ContentNFT {
    /// Unique token ID
    pub token_id: u64,
    /// Author's Stellar address
    pub author: Address,
    /// Article title (max 256 chars)
    pub title: String,
    /// SHA-256 hash of the full content body for verification
    pub content_hash: String,
    /// Short excerpt/preview (max 512 chars)
    pub excerpt: String,
    /// Unix timestamp of creation (ledger timestamp)
    pub created_at: u64,
    /// Whether this content requires payment to access
    pub is_token_gated: bool,
    /// Price in stroops (1 XLM = 10_000_000 stroops), 0 for free content
    pub access_price: i128,
    /// Total XLM raised from access purchases + tips (in stroops)
    pub total_raised: i128,
    /// Number of unique accessors / readers
    pub access_count: u32,
    /// Total number of tips received
    pub tip_count: u32,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct AuthorProfile {
    /// Author's Stellar address
    pub address: Address,
    /// Display name
    pub name: String,
    /// Author biography
    pub bio: String,
    /// Number of articles published
    pub article_count: u32,
    /// Total XLM earned across all content (in stroops)
    pub total_earned: i128,
    /// Unix timestamp of registration
    pub registered_at: u64,
}

// ─── Contract ───────────────────────────────────────────────────────────────

#[contract]
pub struct StellarScribeContract;

#[contractimpl]
impl StellarScribeContract {
    // ── Initialization ──────────────────────────────────────────────────

    /// Initialize the contract with an admin and the native XLM token contract.
    /// The native_token should be the Stellar Asset Contract (SAC) address for XLM.
    pub fn initialize(env: Env, admin: Address, native_token: Address) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage()
            .instance()
            .set(&DataKey::NativeToken, &native_token);
        env.storage().instance().set(&DataKey::NextTokenId, &1u64);

        let empty_ids: Vec<u64> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::AllContentIds, &empty_ids);

        Ok(())
    }

    // ── Author Registry ─────────────────────────────────────────────────

    /// Register an on-chain author identity. Each address can only register once.
    pub fn register_author(env: Env, author: Address, name: String, bio: String) -> Result<AuthorProfile, Error> {
        author.require_auth();

        if env
            .storage()
            .persistent()
            .has(&DataKey::Author(author.clone()))
        {
            return Err(Error::AuthorAlreadyRegistered);
        }

        let profile = AuthorProfile {
            address: author.clone(),
            name,
            bio,
            article_count: 0,
            total_earned: 0,
            registered_at: env.ledger().timestamp(),
        };

        env.storage()
            .persistent()
            .set(&DataKey::Author(author.clone()), &profile);

        let empty_content: Vec<u64> = Vec::new(&env);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorContent(author), &empty_content);

        Ok(profile)
    }

    /// Update an existing author profile's name and bio.
    pub fn update_author(env: Env, author: Address, name: String, bio: String) -> Result<AuthorProfile, Error> {
        author.require_auth();

        let mut profile: AuthorProfile = env
            .storage()
            .persistent()
            .get(&DataKey::Author(author.clone()))
            .ok_or(Error::AuthorNotFound)?;

        profile.name = name;
        profile.bio = bio;

        env.storage()
            .persistent()
            .set(&DataKey::Author(author), &profile);

        Ok(profile)
    }

    /// Retrieve an author profile by address.
    pub fn get_author(env: Env, author: Address) -> Result<AuthorProfile, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Author(author))
            .ok_or(Error::AuthorNotFound)
    }

    // ── Content Minting ─────────────────────────────────────────────────

    /// Mint a new content NFT. The caller becomes the author and owner.
    /// content_hash: SHA-256 hash of the article body (for integrity verification)
    /// access_price: price in stroops (1 XLM = 10_000_000). Set 0 for free content.
    pub fn mint_content(
        env: Env,
        author: Address,
        title: String,
        content_hash: String,
        excerpt: String,
        is_token_gated: bool,
        access_price: i128,
    ) -> Result<ContentNFT, Error> {
        author.require_auth();

        // Ensure author is registered
        if !env
            .storage()
            .persistent()
            .has(&DataKey::Author(author.clone()))
        {
            return Err(Error::AuthorNotFound);
        }

        // Get and increment token ID
        let token_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .ok_or(Error::NotInitialized)?;

        env.storage()
            .instance()
            .set(&DataKey::NextTokenId, &(token_id + 1));

        let content = ContentNFT {
            token_id,
            author: author.clone(),
            title,
            content_hash,
            excerpt,
            created_at: env.ledger().timestamp(),
            is_token_gated,
            access_price: if is_token_gated { access_price } else { 0 },
            total_raised: 0,
            access_count: 0,
            tip_count: 0,
        };

        // Store content
        env.storage()
            .persistent()
            .set(&DataKey::Content(token_id), &content);
        env.storage()
            .persistent()
            .set(&DataKey::ContentOwner(token_id), &author);

        // Author automatically has access to their own content
        env.storage()
            .persistent()
            .set(&DataKey::Access(author.clone(), token_id), &true);

        // Update author profile article count
        let mut profile: AuthorProfile = env
            .storage()
            .persistent()
            .get(&DataKey::Author(author.clone()))
            .ok_or(Error::AuthorNotFound)?;
        profile.article_count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Author(author.clone()), &profile);

        // Add to author's content list
        let mut author_content: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::AuthorContent(author.clone()))
            .unwrap_or(Vec::new(&env));
        author_content.push_back(token_id);
        env.storage()
            .persistent()
            .set(&DataKey::AuthorContent(author), &author_content);

        // Add to global content list
        let mut all_ids: Vec<u64> = env
            .storage()
            .persistent()
            .get(&DataKey::AllContentIds)
            .unwrap_or(Vec::new(&env));
        all_ids.push_back(token_id);
        env.storage()
            .persistent()
            .set(&DataKey::AllContentIds, &all_ids);

        Ok(content)
    }

    // ── Content Access & Token Gating ───────────────────────────────────

    /// Purchase access to token-gated content. Transfers XLM from buyer to the contract,
    /// credited to the author's earnings balance.
    pub fn purchase_access(env: Env, buyer: Address, token_id: u64) -> Result<(), Error> {
        buyer.require_auth();

        let content: ContentNFT = env
            .storage()
            .persistent()
            .get(&DataKey::Content(token_id))
            .ok_or(Error::ContentNotFound)?;

        if !content.is_token_gated {
            return Err(Error::NotTokenGated);
        }

        // Check if user already has access
        if env
            .storage()
            .persistent()
            .has(&DataKey::Access(buyer.clone(), token_id))
        {
            return Err(Error::AlreadyHasAccess);
        }

        // Transfer XLM from buyer to the content author
        let native_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::NativeToken)
            .ok_or(Error::NotInitialized)?;

        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(&buyer, &content.author, &content.access_price);

        // Grant access
        env.storage()
            .persistent()
            .set(&DataKey::Access(buyer.clone(), token_id), &true);

        // Update content stats
        let mut updated_content = content.clone();
        updated_content.total_raised += content.access_price;
        updated_content.access_count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Content(token_id), &updated_content);

        // Update author earnings
        let current_earnings: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Earnings(content.author.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(
            &DataKey::Earnings(content.author.clone()),
            &(current_earnings + content.access_price),
        );

        // Update author profile total earned
        if let Some(mut profile) = env
            .storage()
            .persistent()
            .get::<DataKey, AuthorProfile>(&DataKey::Author(content.author.clone()))
        {
            profile.total_earned += content.access_price;
            env.storage()
                .persistent()
                .set(&DataKey::Author(content.author), &profile);
        }

        Ok(())
    }

    /// Check if a user has access to a specific content token.
    pub fn has_access(env: Env, user: Address, token_id: u64) -> bool {
        // Check if content exists
        let content: Option<ContentNFT> = env.storage().persistent().get(&DataKey::Content(token_id));
        
        match content {
            None => false,
            Some(c) => {
                // Free content: everyone has access
                if !c.is_token_gated {
                    return true;
                }
                // Author always has access
                if c.author == user {
                    return true;
                }
                // Check purchased access
                env.storage()
                    .persistent()
                    .get(&DataKey::Access(user, token_id))
                    .unwrap_or(false)
            }
        }
    }

    // ── Tipping ─────────────────────────────────────────────────────────

    /// Send a tip to the author of a content piece. Transfers XLM directly to the author.
    pub fn tip_author(env: Env, tipper: Address, token_id: u64, amount: i128) -> Result<(), Error> {
        tipper.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidTipAmount);
        }

        let content: ContentNFT = env
            .storage()
            .persistent()
            .get(&DataKey::Content(token_id))
            .ok_or(Error::ContentNotFound)?;

        // Transfer XLM from tipper directly to the author
        let native_token: Address = env
            .storage()
            .instance()
            .get(&DataKey::NativeToken)
            .ok_or(Error::NotInitialized)?;

        let token_client = token::Client::new(&env, &native_token);
        token_client.transfer(&tipper, &content.author, &amount);

        // Update content stats
        let mut updated_content = content.clone();
        updated_content.total_raised += amount;
        updated_content.tip_count += 1;
        env.storage()
            .persistent()
            .set(&DataKey::Content(token_id), &updated_content);

        // Update author profile
        if let Some(mut profile) = env
            .storage()
            .persistent()
            .get::<DataKey, AuthorProfile>(&DataKey::Author(content.author.clone()))
        {
            profile.total_earned += amount;
            env.storage()
                .persistent()
                .set(&DataKey::Author(content.author), &profile);
        }

        Ok(())
    }

    // ── Read Methods ────────────────────────────────────────────────────

    /// Get content metadata by token ID.
    pub fn get_content(env: Env, token_id: u64) -> Result<ContentNFT, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::Content(token_id))
            .ok_or(Error::ContentNotFound)
    }

    /// Get all content IDs.
    pub fn get_all_content_ids(env: Env) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::AllContentIds)
            .unwrap_or(Vec::new(&env))
    }

    /// Get content IDs by a specific author.
    pub fn get_author_content_ids(env: Env, author: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::AuthorContent(author))
            .unwrap_or(Vec::new(&env))
    }

    /// Get the owner of a content token.
    pub fn get_content_owner(env: Env, token_id: u64) -> Result<Address, Error> {
        env.storage()
            .persistent()
            .get(&DataKey::ContentOwner(token_id))
            .ok_or(Error::ContentNotFound)
    }

    /// Get the next token ID (useful for frontend display).
    pub fn get_next_token_id(env: Env) -> Result<u64, Error> {
        env.storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .ok_or(Error::NotInitialized)
    }

    /// Get the total number of minted content pieces.
    pub fn get_total_content(env: Env) -> u64 {
        let next_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextTokenId)
            .unwrap_or(1);
        next_id - 1
    }
}

// ─── Tests ──────────────────────────────────────────────────────────────────

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::testutils::{Address as _, Ledger};
    use soroban_sdk::{Env, String};

    fn setup_contract() -> (Env, Address, StellarScribeContractClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(StellarScribeContract, ());
        let client = StellarScribeContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let native_token = Address::generate(&env);

        client.initialize(&admin, &native_token);

        (env, admin, client)
    }

    #[test]
    fn test_initialize() {
        let (_env, _admin, client) = setup_contract();
        assert_eq!(client.get_next_token_id(), 1);
        assert_eq!(client.get_total_content(), 0);
    }

    #[test]
    fn test_register_author() {
        let (env, _admin, client) = setup_contract();
        let author = Address::generate(&env);

        let profile = client.register_author(
            &author,
            &String::from_str(&env, "Alice"),
            &String::from_str(&env, "Web3 Writer"),
        );

        assert_eq!(profile.name, String::from_str(&env, "Alice"));
        assert_eq!(profile.article_count, 0);
    }

    #[test]
    fn test_mint_content() {
        let (env, _admin, client) = setup_contract();
        let author = Address::generate(&env);

        // Register first
        client.register_author(
            &author,
            &String::from_str(&env, "Alice"),
            &String::from_str(&env, "Writer"),
        );

        // Mint content
        let content = client.mint_content(
            &author,
            &String::from_str(&env, "My First Article"),
            &String::from_str(&env, "abc123hash"),
            &String::from_str(&env, "A short excerpt"),
            &false,
            &0,
        );

        assert_eq!(content.token_id, 1);
        assert_eq!(content.title, String::from_str(&env, "My First Article"));
        assert_eq!(content.is_token_gated, false);
        assert_eq!(client.get_total_content(), 1);

        // Check author profile updated
        let profile = client.get_author(&author);
        assert_eq!(profile.article_count, 1);
    }

    #[test]
    fn test_has_access_free_content() {
        let (env, _admin, client) = setup_contract();
        let author = Address::generate(&env);
        let reader = Address::generate(&env);

        client.register_author(
            &author,
            &String::from_str(&env, "Alice"),
            &String::from_str(&env, "Writer"),
        );

        client.mint_content(
            &author,
            &String::from_str(&env, "Free Article"),
            &String::from_str(&env, "hash"),
            &String::from_str(&env, "excerpt"),
            &false,
            &0,
        );

        // Free content - everyone has access
        assert_eq!(client.has_access(&reader, &1), true);
    }

    #[test]
    fn test_token_gated_content() {
        let (env, _admin, client) = setup_contract();
        let author = Address::generate(&env);
        let reader = Address::generate(&env);

        client.register_author(
            &author,
            &String::from_str(&env, "Alice"),
            &String::from_str(&env, "Writer"),
        );

        // Mint token-gated content
        let content = client.mint_content(
            &author,
            &String::from_str(&env, "Premium Article"),
            &String::from_str(&env, "hash"),
            &String::from_str(&env, "excerpt"),
            &true,
            &50_000_000, // 5 XLM
        );

        assert_eq!(content.is_token_gated, true);
        assert_eq!(content.access_price, 50_000_000);

        // Author has access, random reader does not
        assert_eq!(client.has_access(&author, &1), true);
        assert_eq!(client.has_access(&reader, &1), false);
    }

    #[test]
    fn test_get_all_content_ids() {
        let (env, _admin, client) = setup_contract();
        let author = Address::generate(&env);

        client.register_author(
            &author,
            &String::from_str(&env, "Alice"),
            &String::from_str(&env, "Writer"),
        );

        client.mint_content(
            &author,
            &String::from_str(&env, "Article 1"),
            &String::from_str(&env, "h1"),
            &String::from_str(&env, "e1"),
            &false,
            &0,
        );

        client.mint_content(
            &author,
            &String::from_str(&env, "Article 2"),
            &String::from_str(&env, "h2"),
            &String::from_str(&env, "e2"),
            &true,
            &10_000_000,
        );

        let ids = client.get_all_content_ids();
        assert_eq!(ids.len(), 2);

        let author_ids = client.get_author_content_ids(&author);
        assert_eq!(author_ids.len(), 2);
    }
}
