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
// Custom Cursor Implementation
const initCustomCursor = () => {
  const cursor = document.createElement("div");
  cursor.classList.add("custom-cursor");
  document.body.appendChild(cursor);

  document.addEventListener("mousemove", (e) => {
    cursor.style.left = `${e.clientX}px`;
    cursor.style.top = `${e.clientY}px`;
  });

  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("a, button, input, select, textarea")) {
      cursor.classList.add("hover");
    }
  });
  document.addEventListener("mouseout", (e) => {
    if (e.target.closest("a, button, input, select, textarea")) {
      cursor.classList.remove("hover");
    }
  });
};

document.addEventListener("DOMContentLoaded", initCustomCursor);

// Theme Customization Logic
const initThemeCustomizer = () => {
  const root = document.documentElement;
  const themeBtns = document.querySelectorAll(".theme-btn");

  themeBtns.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const primary = btn.dataset.primary;
      const secondary = btn.dataset.secondary;
      root.style.setProperty("--primary-color", primary);
      root.style.setProperty("--secondary-color", secondary);
      root.style.setProperty(
        "--gradient-primary",
        `linear-gradient(135deg, ${primary}, ${secondary})`,
      );

      // Save preference to localStorage
      localStorage.setItem("primary-color", primary);
      localStorage.setItem("secondary-color", secondary);
    });
  });

  // Load saved theme
  const savedPrimary = localStorage.getItem("primary-color");
  const savedSecondary = localStorage.getItem("secondary-color");
  if (savedPrimary && savedSecondary) {
    root.style.setProperty("--primary-color", savedPrimary);
    root.style.setProperty("--secondary-color", savedSecondary);
    root.style.setProperty(
      "--gradient-primary",
      `linear-gradient(135deg, ${savedPrimary}, ${savedSecondary})`,
    );
  }
};

document.addEventListener("DOMContentLoaded", initThemeCustomizer);

// Live GitHub Activity Feed
const fetchGitHubActivity = async () => {
  try {
    const username = "coraxgs"; // The target organization or user
    const response = await fetch(
      `https://api.github.com/users/${username}/events/public?per_page=5`,
    );
    if (!response.ok) throw new Error("Failed to fetch activity");

    const events = await response.json();
    const activityContainer = document.getElementById("github-activity");

    if (!activityContainer) return;

    events.forEach((event) => {
      const activityItem = document.createElement("div");
      activityItem.className = "activity-item";

      // Format date
      const date = new Date(event.created_at).toLocaleDateString();

      let actionText = "";
      switch (event.type) {
        case "PushEvent":
          actionText = `Pushed to <a href="https://github.com/${event.repo.name}" target="_blank">${event.repo.name}</a>`;
          break;
        case "IssuesEvent":
          actionText = `${event.payload.action} an issue in <a href="https://github.com/${event.repo.name}" target="_blank">${event.repo.name}</a>`;
          break;
        case "PullRequestEvent":
          actionText = `${event.payload.action} a pull request in <a href="https://github.com/${event.repo.name}" target="_blank">${event.repo.name}</a>`;
          break;
        default:
          actionText = `${event.type} on <a href="https://github.com/${event.repo.name}" target="_blank">${event.repo.name}</a>`;
      }

      activityItem.innerHTML = `
                <div class="activity-date">${date}</div>
                <div class="activity-action">${actionText}</div>
            `;
      activityContainer.appendChild(activityItem);
    });
  } catch (error) {
    console.error("Error fetching GitHub activity:", error);
    // Optionally display an error message in the UI
  }
};

document.addEventListener("DOMContentLoaded", fetchGitHubActivity);

// Web Component for GitHub Repository Card
class GithubRepoCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    const title = this.getAttribute("title");
    const description = this.getAttribute("description");
    const url = this.getAttribute("url");
    const tags = this.getAttribute("tags")
      ? this.getAttribute("tags").split(",")
      : [];

    this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    background: #111;
                    border-radius: 16px;
                    padding: 2rem;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                :host(:hover) {
                    transform: translateY(-5px);
                    box-shadow: 0 0 30px rgba(0, 255, 204, 0.3);
                    border-color: rgba(0, 255, 204, 0.3);
                }
                h3 {
                    margin: 0 0 1rem 0;
                    color: #F8F9FA;
                    font-size: 1.5rem;
                }
                a {
                    color: inherit;
                    text-decoration: none;
                    transition: color 0.3s ease;
                }
                a:hover {
                    color: #00FFC2;
                }
                p {
                    color: #E8EAED;
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }
                .tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                .tag {
                    background: rgba(0, 255, 194, 0.1);
                    color: #00FFC2;
                    padding: 0.25rem 0.75rem;
                    border-radius: 20px;
                    font-size: 0.85rem;
                    font-weight: 500;
                    border: 1px solid rgba(0, 255, 194, 0.2);
                }
                .footer a {
                    display: inline-flex;
                    align-items: center;
                    color: #00FFC2;
                    font-weight: 600;
                    text-decoration: none;
                    transition: transform 0.3s ease;
                }
                .footer a:hover {
                    transform: translateX(5px);
                }
            </style>
            <div>
                <h3><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
                <p>${description}</p>
                <div class="tags">
                    ${tags.map((tag) => `<span class="tag">${tag.trim()}</span>`).join("")}
                </div>
                <div class="footer">
                    <a href="${url}" target="_blank" rel="noopener noreferrer">📂 View on GitHub →</a>
                </div>
            </div>
        `;
  }
}

customElements.define("github-repo-card", GithubRepoCard);

// Interactive Architecture Diagram Logic
const initArchDiagram = () => {
  const nodes = document.querySelectorAll(".arch-node");
  const infoBox = document.getElementById("arch-info");

  nodes.forEach((node) => {
    node.addEventListener("mouseenter", () => {
      const info = node.dataset.info;
      if (info && infoBox) {
        infoBox.textContent = info;
      }
    });
    node.addEventListener("mouseleave", () => {
      if (infoBox) {
        infoBox.textContent = "Hover over a component to see details.";
      }
    });
  });
};

document.addEventListener("DOMContentLoaded", initArchDiagram);
