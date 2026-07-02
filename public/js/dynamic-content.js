// Dynamic Content Loader for A-KIME Website
class DynamicContentLoader {
    constructor() {
        this.apiBase = '/api/content';
        this.init();
    }

    async init() {
        try {
            await this.loadCompanyInfo();
            await this.loadServices();
            await this.loadEquipment();
            await this.loadProjects();
            
            // Apply translations after all dynamic content is loaded
            if (window.applyTranslations) {
                console.log('Dynamic content loaded, applying translations...');
                window.applyTranslations();
            }
        } catch (error) {
            console.error('Error loading dynamic content:', error);
        }
    }

    // Fetch JSON and unwrap { success, data } envelope — returns the data payload
    async apiCall(endpoint) {
        try {
            const response = await fetch(endpoint);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const json = await response.json();
            // API returns { success: true, data: [...] } — unwrap it
            if (json && typeof json === 'object' && 'data' in json) return json.data;
            return json; // company endpoint returns the doc directly
        } catch (error) {
            console.error('API call failed:', endpoint, error);
            return null;
        }
    }

    async loadCompanyInfo() {
        const company = await this.apiCall(`${this.apiBase}/company`);
        if (company) this.updateCompanyInfo(company);
    }

    updateCompanyInfo(company) {
        const footerEmail   = document.querySelector('.footer-contact .contact-item:nth-child(1) span');
        const footerPhone   = document.querySelector('.footer-contact .contact-item:nth-child(2) span');
        const footerAddress = document.querySelector('.footer-contact .contact-item:nth-child(3) span');

        if (footerEmail)   footerEmail.textContent   = company.email   || 'infosakime@gmail.com';
        if (footerPhone)   footerPhone.textContent   = company.phone   || '+237 698 01 20 93';
        if (footerAddress) footerAddress.textContent = company.address || 'Yaoundé, Pont Emana, Cameroun';

        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            const heroDescription = document.querySelector('.hero p');
            if (heroDescription && company.description) {
                heroDescription.textContent = company.description;
            }
        }
    }

    async loadServices() {
        const services = await this.apiCall(`${this.apiBase}/services`);
        if (Array.isArray(services) && services.length > 0) this.updateServicesSection(services);
    }

    updateServicesSection(services) {
        const container = document.querySelector('.services-grid');
        if (!container) return;
        services.sort((a, b) => (a.order || 0) - (b.order || 0));
        container.innerHTML = services.map(service => `
            <div class="service-card" data-aos="fade-up">
                <div class="service-icon"><i class="fas ${service.icon || 'fa-tools'}"></i></div>
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                <div class="service-category">${this.getCategoryName(service.category)}</div>
            </div>
        `).join('');
    }

    getCategoryName(category) {
        const map = {
            'genie-civil': 'Génie Civil',
            'metal':       'Construction Métallique',
            'finition':    'Finition',
            'divers':      'Divers'
        };
        return map[category] || category;
    }

    async loadEquipment() {
        const equipment = await this.apiCall(`${this.apiBase}/equipment`);
        if (Array.isArray(equipment) && equipment.length > 0) this.updateEquipmentSection(equipment);
    }

    updateEquipmentSection(equipment) {
        const container = document.querySelector('.equipment-grid');
        if (!container) return;
        container.innerHTML = equipment.map(item => `
            <div class="equipment-card" data-aos="fade-up">
                ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" class="equipment-image" loading="lazy">` : ''}
                <div class="equipment-info">
                    <h3>${item.name}</h3>
                    <div class="equipment-details">
                        ${item.brand ? `<span class="brand">${item.brand}</span>` : ''}
                        ${item.model ? `<span class="model">${item.model}</span>` : ''}
                        ${item.year  ? `<span class="year">${item.year}</span>`   : ''}
                    </div>
                    <p>${item.description}</p>
                    <div class="equipment-category">${this.getEquipmentCategoryName(item.category)}</div>
                </div>
            </div>
        `).join('');
    }

    getEquipmentCategoryName(category) {
        const map = {
            'excavation': 'Excavation',
            'levage':     'Levage',
            'transport':  'Transport',
            'compactage': 'Compactage',
            'outillage':  'Outillage',
            'divers':     'Divers'
        };
        return map[category] || category;
    }

    async loadProjects() {
        const projects = await this.apiCall(`${this.apiBase}/projects`);
        if (Array.isArray(projects) && projects.length > 0) this.updateProjectsSection(projects);
    }

    updateProjectsSection(projects) {
        const container = document.querySelector('.projects-grid');
        if (!container) return;
        projects.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        container.innerHTML = projects.map(project => `
            <div class="project-card" data-aos="fade-up">
                ${project.imageUrl ? `<img src="${project.imageUrl}" alt="${project.title}" class="project-image" loading="lazy">` : ''}
                <div class="project-info">
                    <h3>${project.title}</h3>
                    <p>${project.description}</p>
                    ${project.location ? `<div class="project-location"><i class="fas fa-map-marker-alt"></i> ${project.location}</div>` : ''}
                    ${project.date ? `<div class="project-date"><i class="fas fa-calendar"></i> ${new Date(project.date).getFullYear()}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    async refreshContent() {
        await this.init();
        console.log('Content refreshed');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.dynamicContentLoader = new DynamicContentLoader();
});

window.addEventListener('message', (event) => {
    if (event.data === 'refresh-content' && window.dynamicContentLoader) {
        window.dynamicContentLoader.refreshContent();
    }
});
