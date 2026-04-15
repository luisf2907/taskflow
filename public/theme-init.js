try {
  var isDark = localStorage.getItem('tema') === 'escuro' || (!localStorage.getItem('tema') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (isDark) document.documentElement.classList.add('dark');

  // Schema version — bump quando a paleta base do design system mudar.
  // Saves antigos (sem version ou version < atual) são descartados
  // pra não sobrescrever os tokens novos em CSS.
  var PALETTE_VERSION = 2;
  var storedVersion = parseInt(localStorage.getItem('tf_custom_palette_version') || '0', 10);

  if (storedVersion < PALETTE_VERSION) {
    localStorage.removeItem('tf_custom_palette');
    localStorage.setItem('tf_custom_palette_version', String(PALETTE_VERSION));
  }

  // Custom palette — aplica antes do React hidratar
  var p = localStorage.getItem('tf_custom_palette');
  if (p) {
    var m = {"accent":"--tf-accent","accentHover":"--tf-accent-hover","accentLight":"--tf-accent-light","accentText":"--tf-accent-text","bg":"--tf-bg","bgSecondary":"--tf-bg-secondary","surface":"--tf-surface","surfaceHover":"--tf-surface-hover","text":"--tf-text","textSecondary":"--tf-text-secondary","textTertiary":"--tf-text-tertiary","border":"--tf-border","borderSubtle":"--tf-border-subtle","success":"--tf-success","successBg":"--tf-success-bg","danger":"--tf-danger","dangerBg":"--tf-danger-bg","warning":"--tf-warning","warningBg":"--tf-warning-bg","column":"--tf-column","header":"--tf-header","headerText":"--tf-header-text"};
    var d = JSON.parse(p);
    // Suporta formato { light: {...}, dark: {...} } ou plano { accent: ... }
    var palette = (d.light && typeof d.light === 'object') ? (isDark ? d.dark : d.light) : d;
    if (palette) {
      for (var k in palette) { if (m[k]) document.documentElement.style.setProperty(m[k], palette[k]); }
    }
  }
} catch(e) {}
