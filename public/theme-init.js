try {
  // Dark mode
  if (localStorage.getItem('tema') === 'escuro' || (!localStorage.getItem('tema') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
  // Custom palette — aplica antes do React hidratar pra evitar flash
  var p = localStorage.getItem('tf_custom_palette');
  if (p) {
    var m = {"accent":"--tf-accent","accentHover":"--tf-accent-hover","accentLight":"--tf-accent-light","accentText":"--tf-accent-text","accentYellow":"--tf-accent-yellow","bg":"--tf-bg","bgSecondary":"--tf-bg-secondary","surface":"--tf-surface","text":"--tf-text","textSecondary":"--tf-text-secondary","textTertiary":"--tf-text-tertiary","border":"--tf-border","borderSubtle":"--tf-border-subtle","success":"--tf-success","successBg":"--tf-success-bg","danger":"--tf-danger","dangerBg":"--tf-danger-bg","warning":"--tf-warning","warningBg":"--tf-warning-bg","column":"--tf-column","header":"--tf-header"};
    var d = JSON.parse(p);
    for (var k in d) { if (m[k]) document.documentElement.style.setProperty(m[k], d[k]); }
  }
} catch(e) {}
