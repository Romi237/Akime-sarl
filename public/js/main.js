/* ============================================================
   A-KIME v4 — Main JS
   Handles: navbar scroll, mobile menu, service tabs,
            portfolio filter, testimonial slider, contact form,
            company data injection from API
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Authentication state management ────────────────────────────
  function isAuthenticated() {
    return !!localStorage.getItem('akime_token');
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('akime_user'));
    } catch (e) {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('akime_token');
    localStorage.removeItem('akime_refresh_token');
    localStorage.removeItem('akime_user');
    updateNavForAuth();
    window.location.reload();
  }

  function updateNavForAuth() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;

    if (isAuthenticated()) {
      // User is logged in: show welcome link and logout button
      const user = getCurrentUser();
      navActions.innerHTML = `
        <a href="welcome.html" class="btn-connexion" style="padding: 9px 14px;">
          <i class="fas fa-user-circle"></i> ${user?.name || 'MON COMPTE'}
        </a>
        <button id="navLogoutBtn" class="btn-signup" style="padding: 9px 14px; cursor: pointer;">
          <i class="fas fa-sign-out-alt"></i> DÉCONNECTER
        </button>
        <button class="menu-toggle" id="menuToggle" aria-label="Menu">
          <span></span><span></span><span></span>
        </button>
      `;

      // Re-attach menu toggle listener
      const newMenuToggle = document.getElementById('menuToggle');
      const navLinksEl = document.getElementById('navLinks');
      if (newMenuToggle && navLinksEl) {
        newMenuToggle.setAttribute('aria-expanded', 'false');
        newMenuToggle.addEventListener('click', () => {
          const isOpen = navLinksEl.classList.toggle('active');
          newMenuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
          document.body.style.overflow = isOpen ? 'hidden' : '';
        });
        navLinksEl.querySelectorAll('a').forEach(a => {
          a.addEventListener('click', () => {
            navLinksEl.classList.remove('active');
            newMenuToggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
          });
        });
      }

      // Attach logout listener
      document.getElementById('navLogoutBtn')?.addEventListener('click', logout);
    }
  }

  // Update nav on page load
  updateNavForAuth();

  // ── Navbar scroll effect ──────────────────────────────────
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // ── Active nav link on scroll ────────────────────────────
  const sections = document.querySelectorAll('section[id], div[id]');
  const navLinks  = document.querySelectorAll('.nav-links a[href^="#"]');
  const observer  = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => observer.observe(s));

  // ── Mobile menu ──────────────────────────────────────────
  const menuToggle = document.getElementById('menuToggle');
  const navLinksEl = document.getElementById('navLinks');
  if (menuToggle && navLinksEl) {
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.addEventListener('click', () => {
      const isOpen = navLinksEl.classList.toggle('active');
      menuToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    navLinksEl.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        navLinksEl.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });
  }

  // ── Service tabs ─────────────────────────────────────────
  const tabs = document.querySelectorAll('.service-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const panelId = tab.dataset.panel;
      document.querySelectorAll('.service-panel').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('panel-' + panelId);
      if (target) target.classList.add('active');
    });
  });

  // ── Portfolio filter ─────────────────────────────────────
  let filterBtns = document.querySelectorAll('.filter-btn');
  function initPortfolioFilters() {
    filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        projectCards.forEach(card => {
          const match = filter === 'all' || card.dataset.category === filter;
          card.style.display = match ? '' : 'none';
        });
      });
    });
  }
  initPortfolioFilters();

  // ── Testimonial slider ───────────────────────────────────
  let testimonials = [];
  let dots = [];
  let current = 0;
  let sliderInterval = null;

  function initTestimonialSlider() {
    testimonials = document.querySelectorAll('.testimonial-card');
    dots = document.querySelectorAll('.slider-dot');
    
    // Clear existing interval if any
    if (sliderInterval) clearInterval(sliderInterval);
    
    if (testimonials.length > 0) {
      // Auto-advance every 5 seconds
      sliderInterval = setInterval(() => showTestimonial(current + 1), 5000);
    }
  }

  function showTestimonial(idx) {
    testimonials.forEach(t => t.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    if (testimonials.length > 0) {
      current = (idx + testimonials.length) % testimonials.length;
      if (testimonials[current]) testimonials[current].classList.add('active');
      if (dots[current]) dots[current].classList.add('active');
    }
  }

  document.getElementById('sliderPrev')?.addEventListener('click', () => showTestimonial(current - 1));
  document.getElementById('sliderNext')?.addEventListener('click', () => showTestimonial(current + 1));

  // ── Testimonials from API ─────────────────────────────────
  async function loadTestimonials() {
    try {
      const res  = await fetch('/api/testimonials');
      const json = await res.json();
      const list = json.data;
      
      const slider = document.querySelector('.testimonials-slider');
      if (!slider) return;
      
      // Remove any existing testimonial cards
      const oldCards = slider.querySelectorAll('.testimonial-card');
      oldCards.forEach(c => c.remove());
      
      const controls = slider.querySelector('.slider-controls');
      
      if (Array.isArray(list) && list.length > 0) {
        list.forEach((t, i) => {
          const stars = Array(Math.round(t.rating || 5)).fill('<i class="fas fa-star"></i>').join('');
          const initials = (t.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
          const card = document.createElement('div');
          card.className = 'testimonial-card' + (i === 0 ? ' active' : '');
          card.id = `testimonial-${i}`;
          card.innerHTML = `
            <div class="stars">${stars}</div>
            <p class="testimonial-text">"${t.message}"</p>
            <div class="testimonial-author">
              <div class="author-avatar">${initials}</div>
              <div>
                <div class="author-name">${t.name}</div>
                <div class="author-role">${t.company || ''}</div>
              </div>
            </div>`;
          slider.insertBefore(card, controls);
        });

        // Rebuild dots
        const dotsWrap = slider.querySelector('.slider-dots');
        if (dotsWrap) {
          dotsWrap.innerHTML = list.map((_, i) =>
            `<button class="slider-dot ${i===0?'active':''}" data-idx="${i}"></button>`
          ).join('');
          dotsWrap.querySelectorAll('.slider-dot').forEach(dot =>
            dot.addEventListener('click', () => showTestimonial(+dot.dataset.idx))
          );
        }
      } else {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.color = 'var(--muted-foreground)';
        emptyMsg.style.padding = '40px';
        emptyMsg.textContent = 'Aucun témoignage pour le moment. Soyez le premier à en ajouter un !';
        slider.insertBefore(emptyMsg, controls);
      }
      
      // Re-initialize slider
      initTestimonialSlider();
      
    } catch (e) { 
      console.error('Error loading testimonials:', e);
    }
  }

  // ── Contact form ─────────────────────────────────────────
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');
  if (contactForm) {
    contactForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = contactForm.querySelector('.btn-submit');
      btn.textContent = 'Envoi en cours…';
      btn.disabled = true;

      const data = Object.fromEntries(new FormData(contactForm));
      try {
        const res  = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (json.success) {
          contactForm.style.display = 'none';
          if (formSuccess) formSuccess.style.display = 'block';
        } else {
          throw new Error(json.message || 'Erreur');
        }
      } catch (err) {
        alert('Erreur lors de l\'envoi. Veuillez réessayer.');
        btn.textContent = 'ENVOYER MA DEMANDE DE DEVIS';
        btn.disabled = false;
      }
    });
  }

  // ── Company info from API ────────────────────────────────
  async function loadCompany() {
    try {
      const res  = await fetch('/api/content/company');
      const json = await res.json();
      const co   = json.data || json;
      if (!co) return;
      if (co.phone) {
        const el = document.getElementById('companyPhone');
        if (el) el.textContent = co.phone;
        const fp = document.getElementById('footerPhone');
        if (fp) fp.textContent = co.phone;
      }
      if (co.email) {
        const el = document.getElementById('companyEmail');
        if (el) el.textContent = co.email;
        const fe = document.getElementById('footerEmail');
        if (fe) fe.textContent = co.email;
      }
      if (co.address) {
        const el = document.getElementById('companyAddress');
        if (el) el.textContent = co.address;
        const fa = document.getElementById('footerAddress');
        if (fa) fa.textContent = co.address;
      }
    } catch (e) { /* fallback to static values */ }
  }

  // ── Projects from API ────────────────────────────────────
  async function loadProjects() {
    try {
      const res  = await fetch('/api/content/projects');
      const json = await res.json();
      const projects = json.data;
      
      const grid = document.getElementById('portfolioGrid');
      if (!grid) return;
      
      if (!Array.isArray(projects) || projects.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color: var(--muted-foreground); grid-column: 1/-1; padding: 40px;">Aucun projet pour le moment. Revenez plus tard !</p>';
        return;
      }

      // Map backend category to filter value
      const catMap = {
        civil: 'civil', genie: 'civil', 'genie-civil': 'civil',
        metal: 'metallique', metallique: 'metallique',
        finition: 'finition', renovation: 'renovation',
        'gros-oeuvre': 'gros-oeuvre', nettoyage: 'nettoyage',
        'pure-water': 'pure-water',
      };

      const catLabel = {
        civil: 'GÉNIE CIVIL', metallique: 'MÉTALLIQUE', finition: 'FINITION',
        renovation: 'RÉNOVATION', 'gros-oeuvre': 'GROS ŒUVRE',
        nettoyage: 'NETTOYAGE', 'pure-water': 'PURE WATER',
      };

      grid.innerHTML = projects.map((p, idx) => {
        const cat    = catMap[p.category] || p.category || 'divers';
        const label  = catLabel[cat] || cat.toUpperCase();
        const year   = p.date ? new Date(p.date).getFullYear() : '';
        const imgSrc = p.imageUrl
          ? `<img src="${p.imageUrl}" alt="${p.title}" loading="lazy">`
          : `<div class="project-card-img-placeholder"><i class="fas fa-building"></i></div>`;
        
        const hasGallery = p.gallery && p.gallery.length > 0;
        
        return `
          <div class="project-card" data-category="${cat}">
            <div class="project-card-img">
              ${imgSrc}
              ${year ? `<span class="project-year">${year}</span>` : ''}
              <span class="project-cat">${label}</span>
            </div>
            <div class="project-body">
              <div class="project-title">${p.title}</div>
              <div class="project-desc">${p.description || ''}</div>
              <div class="project-meta">
                ${p.location ? `<span><i class="fas fa-map-marker-alt"></i> ${p.location}</span>` : ''}
              </div>
              ${hasGallery || p.imageUrl ? `<button class="view-gallery-btn" data-idx="${idx}" style="margin-top:12px;width:100%;padding:10px;border:1px solid var(--gold);border-radius:4px;background:transparent;color:var(--gold);font-weight:700;cursor:pointer;transition:all 0.3s;">
                <i class="fas fa-images"></i> VOIR LA GALERIE
              </button>` : ''}
            </div>
          </div>`;
      }).join('');

      // Add gallery modal to DOM
      let galleryModal = document.getElementById('galleryModal');
      let lightboxModal = document.getElementById('lightboxModal');
      
      if (!galleryModal) {
        galleryModal = document.createElement('div');
        galleryModal.id = 'galleryModal';
        galleryModal.className = 'gallery-modal';
        galleryModal.innerHTML = `
          <div class="gallery-modal-content">
            <div class="gallery-modal-header">
              <h2 class="gallery-modal-title" id="galleryModalTitle">Galerie</h2>
              <button class="gallery-modal-close" id="galleryModalClose">
                <i class="fas fa-times"></i>
              </button>
            </div>
            <div class="gallery-grid" id="galleryGrid"></div>
          </div>
        `;
        document.body.appendChild(galleryModal);
        
        // Close modal listener
        document.getElementById('galleryModalClose').addEventListener('click', () => {
          galleryModal.classList.remove('active');
        });
        
        galleryModal.addEventListener('click', (e) => {
          if (e.target === galleryModal) {
            galleryModal.classList.remove('active');
          }
        });
      }
      
      if (!lightboxModal) {
        lightboxModal = document.createElement('div');
        lightboxModal.id = 'lightboxModal';
        lightboxModal.className = 'lightbox-modal';
        lightboxModal.innerHTML = `
          <span class="lightbox-close" id="lightboxClose">&times;</span>
          <img class="lightbox-image" id="lightboxImage">
        `;
        document.body.appendChild(lightboxModal);
        
        document.getElementById('lightboxClose').addEventListener('click', () => {
          lightboxModal.classList.remove('active');
        });
        
        lightboxModal.addEventListener('click', (e) => {
          if (e.target === lightboxModal) {
            lightboxModal.classList.remove('active');
          }
        });
      }

      // Re-bind filter buttons after DOM update
      initPortfolioFilters();

      // Bind gallery buttons
      const viewGalleryBtns = grid.querySelectorAll('.view-gallery-btn');
      viewGalleryBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.idx);
          const project = projects[idx];
          if (project) {
            const galleryGrid = document.getElementById('galleryGrid');
            document.getElementById('galleryModalTitle').textContent = project.title;
            
            // Include main image + gallery images
            const allImages = [project.imageUrl, ...(project.gallery || [])].filter(Boolean);
            
            galleryGrid.innerHTML = allImages.map(img => `
              <div class="gallery-item">
                <img src="${img}" alt="${project.title}" loading="lazy" class="gallery-lightbox-trigger">
              </div>
            `).join('');
            
            galleryModal.classList.add('active');
            
            // Add lightbox click listeners
            document.querySelectorAll('.gallery-lightbox-trigger').forEach(imgElement => {
              imgElement.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('lightboxImage').src = e.target.src;
                lightboxModal.classList.add('active');
              });
            });
          }
        });
      });
    } catch (e) { 
      console.error('Error loading projects:', e);
      const grid = document.getElementById('portfolioGrid');
      if (grid) grid.innerHTML = '<p style="text-align:center; color: var(--muted-foreground); grid-column: 1/-1; padding: 40px;">Erreur lors du chargement des projets.</p>';
    }
  }

  const equipmentData = {
    list: []
  };

  loadCompany();
  loadProjects();
  loadTestimonials();
  loadEquipmentCards();
  initEquipmentFilter();

  // ── Equipment showcase ─────────────────────────────────────
  async function loadEquipmentCards() {
    try {
      const res = await fetch('/api/content/equipment');
      const json = await res.json();
      equipmentData.list = Array.isArray(json.data) ? json.data : [];
      renderEquipmentCards('all');
    } catch (e) {
      console.error('Error loading equipment:', e);
      const grid = document.getElementById('equipmentShowcaseGrid');
      if (grid) {
        grid.innerHTML = '<p class="empty-state">Impossible de charger les équipements pour le moment.</p>';
      }
    }
  }

  function renderEquipmentCards(category = 'all') {
    const grid = document.getElementById('equipmentShowcaseGrid');
    if (!grid) return;

    const categoryLabels = {
      excavation: 'Excavation',
      levage: 'Levage',
      transport: 'Transport',
      compactage: 'Compactage',
      outillage: 'Outillage',
      divers: 'Divers'
    };

    const filtered = category === 'all'
      ? equipmentData.list
      : equipmentData.list.filter(eq => eq.category === category);

    if (!filtered.length) {
      grid.innerHTML = '<p class="empty-state">Aucun équipement disponible pour cette catégorie.</p>';
      return;
    }

    grid.innerHTML = filtered.slice(0, 6).map(eq => {
      const image = eq.imageUrl
        ? `<img src="${eq.imageUrl}" alt="${eq.name}" loading="lazy">`
        : `<i class="fas fa-tools"></i>`;

      return `
        <article class="equipment-showcase-card">
          <div class="equipment-showcase-image">${image}</div>
          <div class="equipment-showcase-body">
            <h3 class="equipment-showcase-title">${eq.name}</h3>
            <div class="equipment-showcase-meta">
              ${eq.category ? `<span>${categoryLabels[eq.category] || eq.category}</span>` : ''}
              ${eq.brand ? `<span>${eq.brand}</span>` : ''}
            </div>
            <p class="equipment-showcase-description">${eq.description || 'Équipement professionnel disponible pour vos chantiers.'}</p>
          </div>
        </article>`;
    }).join('');
  }

  function initEquipmentFilter() {
    const buttons = document.querySelectorAll('#equipmentFilter .filter-btn');
    if (!buttons.length) return;

    buttons.forEach(button => {
      button.addEventListener('click', () => {
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        renderEquipmentCards(button.dataset.category || 'all');
      });
    });
  }
});
