import { supabase, isSupabaseConfigured } from './supabase-config.js';

const grid = document.querySelector('[data-project-grid]');
const status = document.querySelector('[data-project-status]');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function projectCard(project) {
  const tags = Array.isArray(project.technologies) ? project.technologies : [];
  const links = [
    project.github_url ? `<a class="btn btn-outline-dark btn-sm me-2" href="${escapeHtml(project.github_url)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-github me-1"></i>GitHub</a>` : '',
    project.demo_url ? `<a class="btn btn-primary btn-sm" href="${escapeHtml(project.demo_url)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-box-arrow-up-right me-1"></i>Live Demo</a>` : ''
  ].join('');
  const media = project.image_url
    ? `<img class="portfolio-project-image" src="${escapeHtml(project.image_url)}" alt="${escapeHtml(project.title)}" loading="lazy">`
    : `<div class="portfolio-project-placeholder"><i class="bi bi-code-slash"></i></div>`;
  const video = project.video_url && /youtube\.com\/embed\//.test(project.video_url)
    ? `<div class="ratio ratio-16x9 mt-3"><iframe src="${escapeHtml(project.video_url)}" title="${escapeHtml(project.title)} video" loading="lazy" allowfullscreen></iframe></div>` : '';
  return `<article class="card portfolio-project-card overflow-hidden shadow-sm rounded-4 border-0 h-100">
    ${media}<div class="card-body p-4 p-lg-5 d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start gap-2"><span class="badge rounded-pill text-bg-light mb-3">${escapeHtml(project.category || 'Project')}</span></div>
      <h2 class="h3 fw-bolder">${escapeHtml(project.title)}</h2>
      <p class="text-secondary flex-grow-1">${escapeHtml(project.description || '')}</p>
      ${tags.length ? `<div class="d-flex flex-wrap gap-2 mb-3">${tags.map(t => `<span class="badge rounded-pill text-bg-light border">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
      <div>${links}</div>${video}
    </div></article>`;
}

async function loadProjects() {
  if (!grid) return;
  if (!isSupabaseConfigured) {
    if (status) status.textContent = 'Projects will appear here after the Supabase setup is completed.';
    return;
  }
  const { data, error } = await supabase.from('projects').select('*').eq('is_published', true).order('created_at', { ascending: false });
  if (error) {
    if (status) status.textContent = 'Could not load projects. Please try again later.';
    console.error(error);
    return;
  }
  if (status) status.remove();
  if (!data?.length) {
    grid.innerHTML = `<div class="col-12 text-center py-5"><div class="portfolio-empty-icon mb-3"><i class="bi bi-folder2-open"></i></div><h2 class="h4 fw-bold">No projects published yet</h2><p class="text-secondary mb-0">New projects will appear here soon.</p></div>`;
    return;
  }
  grid.innerHTML = data.map(p => `<div class="col-12">${projectCard(p)}</div>`).join('');
}

loadProjects();
