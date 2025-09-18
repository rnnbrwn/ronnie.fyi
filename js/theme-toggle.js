// Theme toggle functionality
(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const body = document.body;
  
  // Get saved theme from localStorage or default to light
  const savedTheme = localStorage.getItem('theme') || 'light';
  
  // Apply saved theme on page load
  function setTheme(theme) {
    if (theme === 'dark') {
      body.setAttribute('data-theme', 'dark');
      themeIcon.className = 'far fa-lightbulb';
      localStorage.setItem('theme', 'dark');
    } else {
      body.removeAttribute('data-theme');
      themeIcon.className = 'far fa-moon'; /* Use outline moon to match lightbulb style */
      localStorage.setItem('theme', 'light');
    }
  }
  
  // Initialize theme on page load
  setTheme(savedTheme);
  
  // Toggle theme on button click
  themeToggle.addEventListener('click', function() {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });
})();