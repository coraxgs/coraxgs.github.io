// Corax CoLAB Enhanced Website JavaScript v2.0

// Performance and Analytics
const CoraxAnalytics = {
  startTime: performance.now(),
  loadTime: 0,
  apiCallCount: 0,
  errors: [],

  init() {
    this.trackErrors();
    this.trackPerformance();
  },

  trackErrors() {
    window.addEventListener("error", (event) => {
      this.errors.push({
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        timestamp: new Date().toISOString(),
      });
    });
  },

  trackPerformance() {
    window.addEventListener("load", () => {
      this.loadTime = performance.now() - this.startTime;
      console.log(`🚀 Page loaded in ${this.loadTime.toFixed(2)}ms`);

      // Send to analytics (if configured)
      if (window.plausible) {
        window.plausible("Performance", {
          props: { loadTime: Math.round(this.loadTime) },
        });
      }
    });
  },
};

// Enhanced GitHub API with caching and rate limiting
class GitHubAPI {
  constructor(username) {
    this.username = username;
    this.cache = new Map();
    this.lastRequest = 0;
    this.rateLimitDelay = 100; // ms between requests
  }

  async fetchWithCache(endpoint, options = {}) {
    const cacheKey = endpoint + JSON.stringify(options);

    // Check cache (5 minute TTL)
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) {
        return cached.data;
      }
    }

    // Rate limiting
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest),
      );
    }

    try {
      this.lastRequest = Date.now();
      CoraxAnalytics.apiCallCount++;

      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/vnd.github.v3+json",
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      // Cache successful responses
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      console.error("GitHub API request failed:", error);
      throw error;
    }
  }

  async getRepos(options = {}) {
    const { sort = "updated", per_page = 20 } = options;
    return this.fetchWithCache(
      `https://api.github.com/users/${this.username}/repos?sort=${sort}&per_page=${per_page}`,
    );
  }

  async getUser() {
    return this.fetchWithCache(`https://api.github.com/users/${this.username}`);
  }

  async getRepoStats(repoName) {
    const [repo, contributors, languages] = await Promise.allSettled([
      this.fetchWithCache(
        `https://api.github.com/repos/${this.username}/${repoName}`,
      ),
      this.fetchWithCache(
        `https://api.github.com/repos/${this.username}/${repoName}/contributors`,
      ),
      this.fetchWithCache(
        `https://api.github.com/repos/${this.username}/${repoName}/languages`,
      ),
    ]);

    return {
      repo: repo.status === "fulfilled" ? repo.value : null,
      contributors:
        contributors.status === "fulfilled" ? contributors.value : [],
      languages: languages.status === "fulfilled" ? languages.value : {},
    };
  }
}

// Enhanced Project Renderer
class ProjectRenderer {
  constructor(container, errorContainer, loadingContainer) {
    this.container = container;
    this.errorContainer = errorContainer;
    this.loadingContainer = loadingContainer;
    this.languageColors = {
      JavaScript: "#f1e05a",
      TypeScript: "#2b7489",
      Python: "#3572A5",
      Go: "#00ADD8",
      Rust: "#dea584",
      Java: "#b07219",
      "C++": "#f34b7d",
      C: "#555555",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Shell: "#89e051",
      Dockerfile: "#384d54",
      Vue: "#4FC08D",
      React: "#61DAFB",
      PHP: "#777BB4",
      Ruby: "#701516",
      Swift: "#FA7343",
      Kotlin: "#F18E33",
    };
  }

  showLoading() {
    this.loadingContainer.style.display = "flex";
    this.container.style.display = "none";
    this.errorContainer.style.display = "none";
  }

  showError(message) {
    this.loadingContainer.style.display = "none";
    this.container.style.display = "none";
    this.errorContainer.style.display = "block";

    const errorTitle = "⚠️ Could not load projects";
    const errorDescription =
      "There was a problem fetching our GitHub repositories. Visit our";
    const linkText = "GitHub profile";

    this.errorContainer.innerHTML = `
      <h3>${errorTitle}</h3>
      <p>${message}</p>
      <p style="margin-top: 1rem; font-size: 0.9rem; opacity: 0.7;">
        ${errorDescription} <a href="https://github.com/coraxgs" target="_blank" style="color: var(--primary-color);">${linkText}</a> 
        directly to see all projects.
      </p>
    `;
  }

  showProjects(repos) {
    this.loadingContainer.style.display = "none";
    this.errorContainer.style.display = "none";
    this.container.style.display = "grid";
    this.container.innerHTML = "";

    if (!repos || repos.length === 0) {
      const noReposMessage = "No public repositories found.";
      this.showError(noReposMessage);
      return;
    }

    const filteredRepos = this.filterAndSortRepos(repos);
    filteredRepos.slice(0, 12).forEach((repo) => {
      this.container.appendChild(this.createProjectCard(repo));
    });

    // Add "View all" card if there are more repos
    if (repos.length > filteredRepos.length || filteredRepos.length > 12) {
      this.container.appendChild(this.createViewAllCard(repos.length));
    }
  }

  filterAndSortRepos(repos) {
    return repos
      .filter((repo) => !repo.fork && !repo.name.includes(".github.io"))
      .sort((a, b) => {
        const scoreA = this.calculateRepoScore(a);
        const scoreB = this.calculateRepoScore(b);
        return scoreB - scoreA;
      });
  }

  calculateRepoScore(repo) {
    let score = 0;

    // Star weight
    score += (repo.stargazers_count || 0) * 10;

    // Fork weight
    score += (repo.forks_count || 0) * 5;

    // Description bonus
    if (repo.description && repo.description.length > 10) score += 15;

    // Recent activity bonus
    const lastUpdate = new Date(repo.updated_at);
    const daysSinceUpdate =
      (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 30) score += 10;
    if (daysSinceUpdate < 7) score += 5;

    // Language bonus
    if (repo.language) score += 5;

    // Topics bonus
    if (repo.topics && repo.topics.length > 0) score += repo.topics.length * 2;

    // Homepage bonus
    if (repo.homepage) score += 8;

    return score;
  }

  createProjectCard(repo) {
    const card = document.createElement("github-repo-card");
    card.setAttribute("title", repo.name);
    card.setAttribute(
      "description",
      repo.description ||
        "An exciting project from Corax CoLAB exploring new technical possibilities.",
    );
    card.setAttribute("url", repo.html_url);

    let tags = [];
    if (repo.language) tags.push(repo.language);
    if (repo.topics) tags = tags.concat(repo.topics.slice(0, 3));
    if (tags.length > 0) {
      card.setAttribute("tags", tags.join(","));
    }

    return card;
  }

  createViewAllCard(totalCount) {
    const card = document.createElement("div");
    card.className = "project-card view-all-card";
    card.style.background = "var(--gradient-primary)";
    card.style.color = "white";
    card.style.textAlign = "center";
    card.style.cursor = "pointer";

    card.innerHTML = `
      <div class="view-all-content">
        <h3 style="color: white; margin-bottom: 1rem;">More projects</h3>
        <p style="color: rgba(255,255,255,0.9); margin-bottom: 2rem;">
          We have more exciting projects on our GitHub profile. Click here to explore them all!
        </p>
        <div style="font-size: 2rem; margin-bottom: 1rem;">🚀</div>
        <div style="color: rgba(255,255,255,0.8); font-size: 0.9rem;">
          Total ${totalCount} public repositories
        </div>
      </div>
    `;

    card.addEventListener("click", () => {
      window.open("https://github.com/coraxgs?tab=repositories", "_blank");
      if (window.plausible) {
        window.plausible("View All Projects Click");
      }
    });

    return card;
  }

  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }
}

// Main Application
class CoraxWebsite {
  constructor() {
    this.githubAPI = new GitHubAPI("coraxgs");
    this.projectRenderer = new ProjectRenderer(
      document.getElementById("projects-grid"),
      document.getElementById("error-message"),
      document.getElementById("loading"),
    );
    this.mobileMenuOpen = false;
    this.theme = "dark";
  }

  async init() {
    CoraxAnalytics.init();
    this.initializeTheme();
    this.setupEventListeners();
    await this.loadProjects();
    this.setupIntersectionObserver();
    this.setupPWA();

    // Mark page as loaded
    document.body.classList.add("loaded");
  }

  initializeTheme() {
    this.theme = localStorage.getItem("corax-theme") || "dark";
    document.documentElement.setAttribute("data-theme", this.theme);
    this.updateThemeButton();
  }

  toggleTheme() {
    this.theme = this.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", this.theme);
    localStorage.setItem("corax-theme", this.theme);
    this.updateThemeButton();

    if (window.plausible) {
      window.plausible("Theme Toggle", { props: { theme: this.theme } });
    }
  }

  updateThemeButton() {
    const button = document.getElementById("theme-toggle");
    if (button) {
      button.textContent = this.theme === "dark" ? "☀️" : "🌙";
      button.setAttribute(
        "aria-label",
        this.theme === "dark"
          ? "Switch to light theme"
          : "Switch to dark theme",
      );
    }
  }

  setupEventListeners() {
    // Mobile menu
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => this.toggleMobileMenu());
    }

    // Theme toggle
    const themeToggle = document.getElementById("theme-toggle");
    if (themeToggle) {
      themeToggle.addEventListener("click", () => this.toggleTheme());
    }

    // Scroll events
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    });

    // Keyboard navigation
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
    });

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.querySelector(anchor.getAttribute("href"));
        if (target) {
          target.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });

          // Close mobile menu if open
          if (this.mobileMenuOpen) {
            this.closeMobileMenu();
          }
        }
      });
    });

    // Logo scroll to top
    const logo = document.querySelector(".logo");
    if (logo) {
      logo.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  handleScroll() {
    // Navbar scroll effect
    const navbar = document.getElementById("navbar");
    if (window.scrollY > 100) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }

    // Update scroll progress
    this.updateScrollProgress();
  }

  updateScrollProgress() {
    const windowHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;
    const scrolled = Math.min((window.scrollY / windowHeight) * 100, 100);

    let progressBar = document.getElementById("scroll-progress");
    if (!progressBar) {
      progressBar = document.createElement("div");
      progressBar.id = "scroll-progress";
      progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #00ffcc, #0066ff);
        z-index: 10001;
        transition: width 0.2s ease;
        pointer-events: none;
      `;
      document.body.appendChild(progressBar);
    }

    progressBar.style.width = `${scrolled}%`;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    const overlay = document.getElementById("mobile-nav-overlay");
    const btn = document.getElementById("mobile-menu-btn");

    if (this.mobileMenuOpen) {
      overlay.classList.add("active");
      btn.classList.add("active");
      document.body.style.overflow = "hidden";
      btn.setAttribute("aria-expanded", "true");
    } else {
      this.closeMobileMenu();
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    const overlay = document.getElementById("mobile-nav-overlay");
    const btn = document.getElementById("mobile-menu-btn");

    overlay.classList.remove("active");
    btn.classList.remove("active");
    document.body.style.overflow = "";
    btn.setAttribute("aria-expanded", "false");
  }

  async loadProjects() {
    try {
      this.projectRenderer.showLoading();

      const [repos, user] = await Promise.all([
        this.githubAPI.getRepos(),
        this.githubAPI.getUser().catch(() => null),
      ]);

      this.projectRenderer.showProjects(repos);

      if (window.plausible) {
        window.plausible("Projects Loaded", {
          props: { count: repos.length, apiCalls: CoraxAnalytics.apiCallCount },
        });
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      const errorMsg = `There was a problem fetching our GitHub repositories: ${error.message}`;
      this.projectRenderer.showError(errorMsg);

      if (window.plausible) {
        window.plausible("Projects Load Error", {
          props: { error: error.message },
        });
      }
    }
  }

  setupIntersectionObserver() {
    if (!("IntersectionObserver" in window)) return;

    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate-in");
          observer.unobserve(entry.target); // Only animate once
        }
      });
    }, observerOptions);

    // Observe elements for animation
    const elementsToObserve = document.querySelectorAll(
      "section, .feature-card, .project-card, .stat-card",
    );

    elementsToObserve.forEach((element) => {
      element.classList.add("animate-ready");
      observer.observe(element);
    });
  }

  setupPWA() {
    // Service Worker registration
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("✅ Service Worker registered:", registration);
          })
          .catch((error) => {
            console.log("❌ Service Worker registration failed:", error);
          });
      });
    }

    // Install prompt
    let deferredPrompt;

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install button after a delay
      setTimeout(() => {
        this.showInstallPrompt(deferredPrompt);
      }, 10000); // 10 seconds delay
    });
  }

  showInstallPrompt(deferredPrompt) {
    const installBtn = document.createElement("button");
    installBtn.innerHTML = "📱 Install app";
    installBtn.className = "install-prompt-btn";
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: linear-gradient(135deg, #00ffcc, #0066ff);
      color: white;
      border: none;
      padding: 12px 20px;
      border-radius: 25px;
      font-weight: 600;
      cursor: pointer;
      z-index: 1000;
      box-shadow: 0 4px 20px rgba(0, 255, 204, 0.3);
      transition: all 0.3s ease;
      font-size: 0.9rem;
      animation: slideInRight 0.3s ease;
    `;

    installBtn.addEventListener("click", async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (window.plausible) {
          window.plausible("PWA Install Prompt", { props: { outcome } });
        }

        deferredPrompt = null;
        installBtn.remove();
      }
    });

    // Add close button
    const closeBtn = document.createElement("span");
    closeBtn.innerHTML = "×";
    closeBtn.style.cssText = `
      position: absolute;
      top: -5px;
      right: 5px;
      cursor: pointer;
      font-size: 1.2rem;
      line-height: 1;
    `;
    closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      installBtn.remove();
    });

    installBtn.appendChild(closeBtn);
    document.body.appendChild(installBtn);

    // Auto-remove after 30 seconds
    setTimeout(() => {
      if (installBtn.parentNode) {
        installBtn.remove();
      }
    }, 30000);
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Set current year
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Initialize main application
  const app = new CoraxWebsite();
  app.init().catch(console.error);
});

// Export for potential external use
window.CoraxWebsite = CoraxWebsite;
// ==========================================
// 5 NEW WORLD CLASS FEATURES IMPLEMENTATION
// ==========================================

// Feature 1: Interactive Neural Network Canvas
// Feature 1: Advanced Swarm Intelligence Canvas
class NeuralNetwork {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.numParticles = window.innerWidth < 768 ? 60 : 180; // More particles for swarm
    this.mouse = { x: null, y: null, radius: 250 };

    window.addEventListener('resize', () => this.init());
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.x;
      this.mouse.y = e.y;
    });

    this.init();
    this.animate();
  }

  init() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.particles = [];
    for (let i = 0; i < this.numParticles; i++) {
      let x = Math.random() * this.canvas.width;
      let y = Math.random() * this.canvas.height;
      let size = Math.random() * 2 + 1;
      let speedX = (Math.random() - 0.5) * 2;
      let speedY = (Math.random() - 0.5) * 2;
      this.particles.push(new Particle(x, y, speedX, speedY, size, this.ctx, this.canvas, this.mouse, this.particles));
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // Trail effect instead of clearRect
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();

    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].update();
      this.particles[i].draw(primaryColor);
    }

    // Connect particles (Swarm connections)
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        let dx = this.particles[i].x - this.particles[j].x;
        let dy = this.particles[i].y - this.particles[j].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          this.ctx.beginPath();
          this.ctx.strokeStyle = primaryColor;
          this.ctx.globalAlpha = 1 - (distance / 100);
          this.ctx.lineWidth = 0.5;
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.stroke();
          this.ctx.globalAlpha = 1.0;
        }
      }
    }
  }
}

class Particle {
  constructor(x, y, speedX, speedY, size, ctx, canvas, mouse, allParticles) {
    this.x = x;
    this.y = y;
    this.vx = speedX;
    this.vy = speedY;
    this.size = size;
    this.ctx = ctx;
    this.canvas = canvas;
    this.mouse = mouse;
    this.allParticles = allParticles;
  }

  update() {
    // Mouse attraction (Swarm focus)
    if (this.mouse.x != null && this.mouse.y != null) {
      let dx = this.mouse.x - this.x;
      let dy = this.mouse.y - this.y;
      let distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.mouse.radius) {
        let forceDirectionX = dx / distance;
        let forceDirectionY = dy / distance;
        let force = (this.mouse.radius - distance) / this.mouse.radius;
        this.vx += forceDirectionX * force * 0.2;
        this.vy += forceDirectionY * force * 0.2;
      }
    }

    // Flocking logic (Boids: Separation, Alignment, Cohesion)
    let separationDist = 30;
    let neighborDist = 120;
    let avgVx = 0, avgVy = 0, count = 0;

    this.allParticles.forEach(p => {
      if (p === this) return;
      let d = Math.hypot(p.x - this.x, p.y - this.y);

      if (d > 0 && d < separationDist) {
        // Separation
        this.vx -= (p.x - this.x) * 0.02;
        this.vy -= (p.y - this.y) * 0.02;
      } else if (d > 0 && d < neighborDist) {
        // Alignment & Cohesion
        avgVx += p.vx;
        avgVy += p.vy;
        count++;
      }
    });

    if (count > 0) {
      avgVx /= count;
      avgVy /= count;
      this.vx += (avgVx - this.vx) * 0.05;
      this.vy += (avgVy - this.vy) * 0.05;
    }

    // Limit speed
    let speed = Math.hypot(this.vx, this.vy);
    let maxSpeed = 3;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    // Friction
    this.vx *= 0.98;
    this.vy *= 0.98;

    this.x += this.vx;
    this.y += this.vy;

    // Bounce
    if (this.x < 0 || this.x > this.canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > this.canvas.height) this.vy *= -1;

    this.x = Math.max(0, Math.min(this.canvas.width, this.x));
    this.y = Math.max(0, Math.min(this.canvas.height, this.y));
  }

  draw(color) {
    this.ctx.beginPath();
    this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = color;
    this.ctx.fill();
    this.ctx.shadowBlur = 0;
  }
}
  }
}

// Feature 2: Custom Cursor
class CustomCursor {
  constructor() {
    this.cursor = document.querySelector('.custom-cursor');
    this.follower = document.querySelector('.custom-cursor-follower');
    if (!this.cursor || !this.follower) return;

    // Check if device supports hover (not a mobile device usually)
    if (window.matchMedia("(any-hover: none)").matches) {
      this.cursor.style.display = 'none';
      this.follower.style.display = 'none';
      return;
    }

    this.pos = { x: 0, y: 0 };
    this.followerPos = { x: 0, y: 0 };
    this.init();
  }

  init() {
    document.addEventListener('mousemove', (e) => {
      this.pos.x = e.clientX;
      this.pos.y = e.clientY;

      this.cursor.style.left = this.pos.x + 'px';
      this.cursor.style.top = this.pos.y + 'px';
    });

    const loop = () => {
      // Follower easing
      this.followerPos.x += (this.pos.x - this.followerPos.x) * 0.15;
      this.followerPos.y += (this.pos.y - this.followerPos.y) * 0.15;

      this.follower.style.left = this.followerPos.x + 'px';
      this.follower.style.top = this.followerPos.y + 'px';

      requestAnimationFrame(loop);
    };
    loop();

    // Hover effects on links/buttons
    const interactiveElements = document.querySelectorAll('a, button, .tilt-card, input, textarea');
    interactiveElements.forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    // Add magnetic effect to CTA buttons
    const magneticElements = document.querySelectorAll('.cta-button, .logo');
    magneticElements.forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px) scale(1.05)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0px, 0px) scale(1)';
      });
    });
  }
}

// Feature 3: 3D Tilt Cards
// Feature 5: Holographic 3D Glass Cards (Tilt + Glare)
class TiltEffect {
  constructor() {
    this.cards = document.querySelectorAll('.tilt-card');
    if (!this.cards.length) return;
    this.init();
  }

  init() {
    this.cards.forEach(card => {
      // Add glare element if not exists
      if (!card.querySelector('.tilt-card-glare')) {
        const glare = document.createElement('div');
        glare.className = 'tilt-card-glare';
        card.appendChild(glare);
      }

      card.addEventListener('mousemove', this.handleMouseMove.bind(this));
      card.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'none'; // Snappier follow
        const glare = card.querySelector('.tilt-card-glare');
        if (glare) glare.style.opacity = '1';
      });
    });
  }

  handleMouseMove(e) {
    const card = e.currentTarget;
    const glare = card.querySelector('.tilt-card-glare');
    const rect = card.getBoundingClientRect();

    // Calculate mouse position relative to card center (0 to 1)
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate rotation (-15deg to +15deg max)
    const rotateX = ((y - centerY) / centerY) * -15; // Invert Y
    const rotateY = ((x - centerX) / centerX) * 15;

    // Apply 3D transform
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;

    // Move Glare gradient opposite to mouse
    if (glare) {
      glare.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(255, 255, 255, 0.3) 0%, transparent 60%)`;
    }
  }

  handleMouseLeave(e) {
    const card = e.currentTarget;
    const glare = card.querySelector('.tilt-card-glare');

    card.style.transition = 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';

    if (glare) {
      glare.style.transition = 'opacity 0.5s ease';
      glare.style.opacity = '0';
    }
  }
}

// Feature 5: Terminal Boot Sequence
// Feature 4: Interactive AI Terminal
class TerminalBoot {
  constructor(elementId) {
    this.container = document.getElementById(elementId);
    if (!this.container) return;
    this.lines = [
      "Initializing Corax OS v2.0...",
      "Loading kernel modules...",
      "[OK] Swarm Intelligence loaded.",
      "[OK] Post-Quantum Cryptography initialized.",
      "[OK] Edge AI Node connected.",
      "Connection established. Awaiting command."
    ];
    this.currentLine = 0;
    this.container.innerHTML = ''; // Clear initial content
    this.init();
  }

  async init() {
    // Boot sequence
    for (let i = 0; i < this.lines.length; i++) {
      await this.typeLine(this.lines[i]);
    }
    this.setupInput();
  }

  async typeLine(text, delay = 50) {
    return new Promise(resolve => {
      const lineElement = document.createElement("div");
      lineElement.className = "terminal-line";
      this.container.appendChild(lineElement);

      let i = 0;
      const interval = setInterval(() => {
        lineElement.textContent += text.charAt(i);
        i++;
        this.container.scrollTop = this.container.scrollHeight;
        if (i >= text.length) {
          clearInterval(interval);
          setTimeout(resolve, 200);
        }
      }, delay);
    });
  }

  setupInput() {
    const inputContainer = document.createElement('div');
    inputContainer.className = 'terminal-input-line';
    inputContainer.innerHTML = '<span class="prompt">root@corax:~#</span> <input type="text" id="terminal-input" autocomplete="off" autofocus>';
    this.container.appendChild(inputContainer);

    const inputField = document.getElementById('terminal-input');

    // Focus input when terminal is clicked
    this.container.parentElement.addEventListener('click', () => {
      inputField.focus();
    });

    inputField.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        const cmd = inputField.value.trim().toLowerCase();
        inputField.value = '';
        inputContainer.remove(); // Remove input to print response

        await this.typeLine(`root@corax:~# ${cmd}`, 10);
        await this.processCommand(cmd);

        this.setupInput(); // Re-add input after response
        inputField.focus();
      }
    });
  }

  async processCommand(cmd) {
    switch (cmd) {
      case 'help':
        await this.typeLine("Available commands:");
        await this.typeLine("  status   - Show system diagnostics");
        await this.typeLine("  analyze  - Run environmental analysis");
        await this.typeLine("  deploy   - Initialize GAPbot swarm protocol");
        await this.typeLine("  clear    - Clear terminal output");
        break;
      case 'status':
        await this.typeLine("[System Status]");
        await this.typeLine("- Edge Nodes: 4/4 Online");
        await this.typeLine("- Swarm Latency: < 5ms");
        await this.typeLine("- Compliance Logic: ACTIVE (EU AI Act Compliant)");
        await this.typeLine("- GAPbot Fleet: Idle, charging via MPPT.");
        break;
      case 'analyze':
        await this.typeLine("Initiating Edge AI analysis (YOLOv8-Seg)...");
        await this.typeLine("[██████████] 100%");
        await this.typeLine("Result: Nominal. Resource usage optimized by 42%.");
        break;
      case 'deploy':
        await this.typeLine("WARNING: Authorized personnel only.");
        await this.typeLine("Authenticating via Web3 wallet...");
        setTimeout(async () => {
          await this.typeLine("Authentication successful. Deploying GAPbot unit Alpha.");
        }, 1000);
        break;
      case 'clear':
        this.container.innerHTML = '';
        break;
      case '':
        break;
      default:
        await this.typeLine(`Command not found: ${cmd}. Type 'help' for options.`);
    }
  }
}
  }

  typeChar(element, text, index) {
    if (index < text.length) {
      element.innerHTML += text.charAt(index);
      this.container.scrollTop = this.container.scrollHeight;
      setTimeout(() => this.typeChar(element, text, index + 1), Math.random() * 30 + 10);
    } else {
      this.container.innerHTML += '<span class="cursor-blink"></span>';
      this.currentLine++;
      setTimeout(() => this.typeLine(), Math.random() * 400 + 100);
    }
  }
}

// Initialize New Features
document.addEventListener('DOMContentLoaded', () => {
  // Add a slight delay to ensure original scripts are loaded
  setTimeout(() => {
    new NeuralNetwork('neural-canvas');
    new CustomCursor();
    new TiltEffect();
    new TerminalBoot('terminal-body');
  }, 100);
});

// Feature 2: 3D GAPbot Wireframe (Three.js)
function init3DGAPbot() {
  const container = document.getElementById('gapbot-3d-container');
  if (!container || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.z = 15;
  camera.position.y = 5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Group to rotate everything
  const robotGroup = new THREE.Group();
  scene.add(robotGroup);

  // Material for wireframe
  const material = new THREE.MeshBasicMaterial({
    color: 0x00ffc2,
    wireframe: true,
    transparent: true,
    opacity: 0.8
  });

  // Body (Hexagon-ish shape for hexapod)
  const bodyGeo = new THREE.CylinderGeometry(2, 2.5, 1, 6);
  const body = new THREE.Mesh(bodyGeo, material);
  robotGroup.add(body);

  // Legs (6 legs around the body)
  const numLegs = 6;
  const radius = 2.5;

  for (let i = 0; i < numLegs; i++) {
    const angle = (i / numLegs) * Math.PI * 2;

    // Leg group
    const legGroup = new THREE.Group();

    // Coxa (base joint)
    const coxaGeo = new THREE.BoxGeometry(1.5, 0.5, 0.5);
    const coxa = new THREE.Mesh(coxaGeo, material);
    coxa.position.x = 0.75;
    legGroup.add(coxa);

    // Femur (upper leg)
    const femurGeo = new THREE.BoxGeometry(2, 0.4, 0.4);
    const femur = new THREE.Mesh(femurGeo, material);
    femur.position.x = 2.5;
    femur.rotation.z = Math.PI / 4; // Angle down
    legGroup.add(femur);

    // Tibia (lower leg)
    const tibiaGeo = new THREE.BoxGeometry(2.5, 0.3, 0.3);
    const tibia = new THREE.Mesh(tibiaGeo, material);
    tibia.position.x = 3.5;
    tibia.position.y = -1.5;
    tibia.rotation.z = -Math.PI / 3;
    legGroup.add(tibia);

    // Position and rotate leg around body
    legGroup.position.x = Math.cos(angle) * radius;
    legGroup.position.z = Math.sin(angle) * radius;
    legGroup.rotation.y = -angle; // Point outward

    robotGroup.add(legGroup);
  }

  // Animation Loop
  let time = 0;
  function animate() {
    requestAnimationFrame(animate);

    // Rotate entire robot slowly
    robotGroup.rotation.y += 0.005;

    // Animate legs for walking effect
    time += 0.05;
    robotGroup.children.forEach((child, index) => {
      if (index > 0) { // Skip body (index 0)
        // Simulate walking gait (offset phase based on leg index)
        const phase = (index % 2 === 0) ? 0 : Math.PI;
        child.position.y = Math.sin(time + phase) * 0.3;
      }
    });

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}

// Feature 2 (continued): Cinematic Scroll Animations (GSAP)
function initScrollAnimations() {
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  // Fade up headers
  gsap.utils.toArray('.section-title').forEach(title => {
    gsap.from(title, {
      scrollTrigger: {
        trigger: title,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      },
      y: 50,
      opacity: 0,
      duration: 1,
      ease: 'power3.out'
    });
  });

  // Stagger feature cards
  gsap.utils.toArray('.features-grid').forEach(grid => {
    const cards = grid.querySelectorAll('.feature-card');
    gsap.from(cards, {
      scrollTrigger: {
        trigger: grid,
        start: 'top 80%',
      },
      y: 100,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'back.out(1.7)'
    });
  });

  // Fade in 3D container
  const container3d = document.getElementById('gapbot-3d-container');
  if (container3d) {
    gsap.from(container3d, {
      scrollTrigger: {
        trigger: container3d,
        start: 'top 75%'
      },
      scale: 0.8,
      opacity: 0,
      rotationX: -20,
      duration: 1.5,
      ease: 'power2.out'
    });
  }

  // Projects Grid
  gsap.utils.toArray('.projects-grid').forEach(grid => {
    const cards = grid.querySelectorAll('.project-card');
    if(cards.length) {
       gsap.from(cards, {
        scrollTrigger: {
          trigger: grid,
          start: 'top 80%',
        },
        x: -50,
        opacity: 0,
        duration: 0.8,
        stagger: 0.2,
        ease: 'power3.out'
      });
    }
  });
}
