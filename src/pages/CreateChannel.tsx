import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Hash, ArrowRight, Plus, Lock, Unlock, AlertCircle } from 'lucide-react';
import { useChannelStore, type Channel } from '../store/useChannelStore';
import { useWallet } from '../store/useWallet';
import { formatAddress } from '../lib/utils';

const BANNER_COLORS = [
  { label: 'بنفسجي',   value: 'from-primary/30 to-accent/20' },
  { label: 'أخضر',    value: 'from-green-600/30 to-emerald-400/20' },
  { label: 'وردي',    value: 'from-purple-600/30 to-pink-400/20' },
  { label: 'ذهبي',    value: 'from-yellow-600/30 to-orange-400/20' },
  { label: 'أحمر',    value: 'from-rose-600/30 to-fuchsia-400/20' },
  { label: 'أزرق',    value: 'from-blue-600/30 to-cyan-400/20' },
];

const SUGGESTED_ICONS = ['⚡', '🌍', '✍️', '💰', '🎨', '📡', '🚀', '🔬', '📚', '🏆', '💎', '🌐'];

const TAG_SUGGESTIONS = ['web3', 'defi', 'nft', 'stellar', 'arabic', 'crypto', 'art', 'writing', 'news', 'tech'];

export function CreateChannel() {
  const navigate = useNavigate();
  const { addChannel, joinChannel } = useChannelStore();
  const { isConnected, publicKey } = useWallet();

  const [form, setForm] = useState({
    name: '',
    id: '',
    description: '',
    icon: '⚡',
    bannerColor: BANNER_COLORS[0].value,
    isPrivate: false,
  });
  const [tags, setTags]         = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors]     = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 30);
    setForm((f) => ({ ...f, name, id: slug }));
  };

  const addTag = (tag: string) => {
    const clean = tag.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 20);
    if (clean && !tags.includes(clean) && tags.length < 5) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())        e.name        = 'اسم القناة مطلوب';
    if (!form.id.trim())          e.id          = 'معرّف القناة مطلوب';
    if (form.id.length < 3)       e.id          = 'المعرّف يجب أن يكون 3 أحرف على الأقل';
    if (!form.description.trim()) e.description = 'وصف القناة مطلوب';
    if (form.description.length < 20) e.description = 'الوصف يجب أن يكون 20 حرفاً على الأقل';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !publicKey) return;
    setSubmitting(true);

    const newChannel: Channel = {
      id:               form.id,
      name:             form.name,
      description:      form.description,
      icon:             form.icon,
      bannerColor:      form.bannerColor,
      isPrivate:        form.isPrivate,
      tags,
      creatorPublicKey: publicKey,
      memberCount:      1,
      postCount:        0,
      createdAt:        Date.now(),
    };

    // Small artificial delay for UX
    await new Promise((r) => setTimeout(r, 600));
    addChannel(newChannel);
    joinChannel(form.id);
    navigate(`/channels/${form.id}`);
  };

  // ── Wallet not connected guard ───────────────────────────────────────────
  if (!isConnected) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Hash className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-serif mb-3">المحفظة مطلوبة</h2>
        <p className="text-[14px] text-[var(--color-text-dim)] leading-relaxed mb-6 font-mono">
          يجب ربط محفظتك لإنشاء قناة جديدة على المنصة.
        </p>
        <Link to="/channels" className="btn-outline flex items-center gap-2 w-fit mx-auto">
          <ArrowRight className="w-4 h-4 rtl:rotate-180" /> العودة إلى القنوات
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 animate-fadeIn">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-[12px] font-mono text-[var(--color-text-dim)] mb-8">
        <Link to="/channels" className="hover:text-primary transition-colors flex items-center gap-1">
          <Hash className="w-3 h-3" /> القنوات
        </Link>
        <ArrowRight className="w-3 h-3 rtl:rotate-180" />
        <span className="text-[var(--color-text-secondary)]">إنشاء قناة جديدة</span>
      </div>

      <div className="mb-8">
        <h1 className="text-[36px] font-serif tracking-[-1px] mb-2">
          إنشاء <span className="text-gradient">قناة جديدة</span>
        </h1>
        <p className="text-[14px] text-[var(--color-text-dim)]">
          ابن مجتمعك الخاص وشارك الأفكار مع المهتمين.
        </p>
      </div>

      {/* Live Preview */}
      <div className="glass-panel overflow-hidden mb-8">
        <div className={`h-20 bg-gradient-to-r ${form.bannerColor} relative`}>
          <div className="absolute bottom-0 left-5 translate-y-1/2 w-12 h-12 rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border)] flex items-center justify-center text-2xl">
            {form.icon}
          </div>
        </div>
        <div className="pt-10 pb-4 px-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[18px] font-serif text-[var(--color-text-main)]">
              {form.name || 'اسم القناة'}
            </span>
            {form.isPrivate && <Lock className="w-3.5 h-3.5 text-[var(--color-text-dim)]" />}
          </div>
          <span className="text-[11px] font-mono text-primary/50">#{form.id || 'channel-id'}</span>
          <p className="text-[12px] text-[var(--color-text-dim)] mt-1 line-clamp-1">
            {form.description || 'وصف القناة سيظهر هنا...'}
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">

        {/* Name */}
        <div>
          <label className="label-sm block mb-2">اسم القناة *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={60}
            placeholder="مثال: مطوري Stellar"
            className={`input-field w-full ${errors.name ? 'border-red-500/50' : ''}`}
          />
          {errors.name && (
            <p className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400">
              <AlertCircle className="w-3 h-3" /> {errors.name}
            </p>
          )}
        </div>

        {/* Slug */}
        <div>
          <label className="label-sm block mb-2">معرّف القناة (URL) *</label>
          <div className="flex items-center gap-0">
            <span className="px-3 h-[42px] flex items-center bg-[var(--color-surface)] border border-r-0 border-[var(--color-border)] rounded-l-sm text-[12px] font-mono text-[var(--color-text-dim)] rtl:rounded-r-sm rtl:rounded-l-none rtl:border-l-0 rtl:border-r">
              /channels/
            </span>
            <input
              type="text"
              value={form.id}
              onChange={(e) => setForm((f) => ({ ...f, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30) }))}
              placeholder="stellar-dev"
              className={`input-field flex-1 rounded-l-none rtl:rounded-r-none ${errors.id ? 'border-red-500/50' : ''}`}
            />
          </div>
          {errors.id && (
            <p className="flex items-center gap-1 mt-1.5 text-[11px] text-red-400">
              <AlertCircle className="w-3 h-3" /> {errors.id}
            </p>
          )}
          <p className="mt-1.5 text-[11px] text-[var(--color-text-muted)] font-mono">
            أحرف إنجليزية صغيرة وأرقام وشرطة فقط
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="label-sm block mb-2">الوصف *</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            maxLength={300}
            rows={4}
            placeholder="اشرح هدف القناة وما الذي سيجده الأعضاء فيها..."
            className={`input-field w-full resize-none ${errors.description ? 'border-red-500/50' : ''}`}
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description
              ? <p className="flex items-center gap-1 text-[11px] text-red-400"><AlertCircle className="w-3 h-3" /> {errors.description}</p>
              : <span />}
            <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
              {form.description.length}/300
            </span>
          </div>
        </div>

        {/* Icon picker */}
        <div>
          <label className="label-sm block mb-2">أيقونة القناة</label>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon }))}
                className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center border transition-all cursor-pointer ${
                  form.icon === icon
                    ? 'border-primary bg-primary/10 shadow-[0_0_10px_rgba(108,58,255,0.3)]'
                    : 'border-[var(--color-border)] hover:border-primary/40 hover:bg-[var(--color-surface)]'
                }`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>

        {/* Banner color */}
        <div>
          <label className="label-sm block mb-2">لون الغلاف</label>
          <div className="flex flex-wrap gap-3">
            {BANNER_COLORS.map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, bannerColor: value }))}
                className={`group relative h-12 w-24 rounded-lg bg-gradient-to-r ${value} border-2 transition-all cursor-pointer overflow-hidden ${
                  form.bannerColor === value ? 'border-white/60 shadow-[0_0_12px_rgba(255,255,255,0.15)]' : 'border-transparent hover:border-white/20'
                }`}
                title={label}
              >
                {form.bannerColor === value && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center text-white text-xs">✓</div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="label-sm block mb-2">الأوسمة (حتى 5)</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-mono text-primary"
              >
                #{tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors cursor-pointer">×</button>
              </span>
            ))}
          </div>
          {tags.length < 5 && (
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag(tagInput); } }}
                placeholder="اكتب وسماً واضغط Enter"
                className="input-field flex-1 text-[13px]"
              />
              <button
                type="button"
                onClick={() => addTag(tagInput)}
                className="px-4 py-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-sm text-[12px] font-mono hover:border-primary/30 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {TAG_SUGGESTIONS.filter((t) => !tags.includes(t)).slice(0, 6).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addTag(t)}
                className="px-2 py-0.5 rounded-full border border-[var(--color-border)] text-[10px] font-mono text-[var(--color-text-dim)] hover:border-primary/30 hover:text-primary transition-colors cursor-pointer"
              >
                +{t}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div>
          <label className="label-sm block mb-3">نوع القناة</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { val: false, icon: Unlock, title: 'عامة', desc: 'يمكن لأي شخص الانضمام والمشاركة' },
              { val: true,  icon: Lock,   title: 'خاصة', desc: 'بالدعوة فقط (قريباً)' },
            ].map(({ val, icon: Icon, title, desc }) => (
              <button
                key={String(val)}
                type="button"
                onClick={() => setForm((f) => ({ ...f, isPrivate: val }))}
                disabled={val}
                className={`p-4 rounded-xl border text-right transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  form.isPrivate === val && !val
                    ? 'border-primary bg-primary/5 shadow-[0_0_12px_rgba(108,58,255,0.15)]'
                    : 'border-[var(--color-border)] hover:border-primary/30'
                }`}
              >
                <Icon className={`w-5 h-5 mb-2 ${form.isPrivate === val ? 'text-primary' : 'text-[var(--color-text-dim)]'}`} />
                <div className="text-[13px] font-semibold">{title}</div>
                <div className="text-[11px] text-[var(--color-text-dim)] mt-0.5">{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Creator info */}
        <div className="glass-panel p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-sm">
            👤
          </div>
          <div>
            <div className="text-[12px] text-[var(--color-text-dim)]">ستُنشأ القناة باسم</div>
            <div className="text-[13px] font-mono text-primary">{formatAddress(publicKey)}</div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-4 pt-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="btn-primary flex items-center gap-2 px-8 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الإنشاء...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> إنشاء القناة
              </>
            )}
          </button>
          <Link to="/channels" className="btn-outline">
            إلغاء
          </Link>
        </div>
      </div>
    </div>
  );
}
