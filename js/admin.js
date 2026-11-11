import { supabase, isSupabaseConfigured } from './supabase-config.js';

const $ = (s) => document.querySelector(s);
const loginPanel = $('#admin-login-panel');
const dashboardPanel = $('#admin-dashboard-panel');
const loginForm = $('#admin-login-form');
const projectForm = $('#project-form');
const message = $('#admin-message');
const list = $('#admin-project-list');
const submitButton = $('#project-submit');
let editingId = null;
let currentImagePath = null;

function showMessage(text, type = 'info') {
  message.className = `alert alert-${type}`;
  message.textContent = text;
  message.hidden = false;
}
function clearMessage() { message.hidden = true; }
function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function safeUrl(value) {
  if (!value) return '';
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.toString() : ''; }
  catch { return ''; }
}

async function requireAdmin() {
  if (!isSupabaseConfigured) {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    showMessage('Supabase is not configured yet. Add your Project URL and anon/publishable key in js/supabase-config.js.', 'warning');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    return;
  }
  const { data: admin, error } = await supabase.from('portfolio_admins').select('user_id').eq('user_id', session.user.id).maybeSingle();
  if (error || !admin) {
    await supabase.auth.signOut();
    loginPanel.hidden = false;
    dashboardPanel.hidden = true;
    showMessage('This account is not authorised as a portfolio admin.', 'danger');
    return;
  }
  loginPanel.hidden = true;
  dashboardPanel.hidden = false;
  $('#admin-email').textContent = session.user.email || 'Admin';
  await loadAdminProjects();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault(); clearMessage();
  if (!isSupabaseConfigured) return requireAdmin();
  const email = $('#admin-email-input').value.trim();
  const password = $('#admin-password-input').value;
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return showMessage(error.message, 'danger');
  loginForm.reset();
  await requireAdmin();
});

$('#admin-logout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  projectForm.reset(); editingId = null; currentImagePath = null;
  await requireAdmin();
});

function resetProjectForm() {
  projectForm.reset(); editingId = null; currentImagePath = null;
  $('#project-form-heading').textContent = 'Add a project';
  submitButton.textContent = 'Publish project';
  $('#cancel-edit').hidden = true;
  $('#project-image-preview').hidden = true;
}
$('#cancel-edit').addEventListener('click', resetProjectForm);

async function uploadImage(file) {
  if (!file) return currentImagePath;
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('project-images').upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('project-images').getPublicUrl(path);
  return { path, url: data.publicUrl };
}

projectForm.addEventListener('submit', async (event) => {
  event.preventDefault(); clearMessage();
  submitButton.disabled = true;
  try {
    const file = $('#project-image').files[0];
    const uploaded = await uploadImage(file);
    const imageUrl = uploaded?.url || $('#project-image-url').value.trim() || null;
    const imagePath = uploaded?.path || currentImagePath;
    const tags = $('#project-technologies').value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 20);
    const payload = {
      title: $('#project-title').value.trim(),
      description: $('#project-description').value.trim(),
      category: $('#project-category').value.trim() || 'Project',
      technologies: tags,
      image_url: imageUrl,
      image_path: imagePath,
      github_url: safeUrl($('#project-github').value.trim()) || null,
      demo_url: safeUrl($('#project-demo').value.trim()) || null,
      video_url: safeUrl($('#project-video').value.trim()) || null,
      is_published: $('#project-published').checked
    };
    if (!payload.title) throw new Error('Project title is required.');
    if (editingId) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editingId);
      if (error) throw error;
      showMessage('Project updated successfully.', 'success');
    } else {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) throw error;
      showMessage('Project added successfully.', 'success');
    }
    resetProjectForm();
    await loadAdminProjects();
  } catch (error) {
    showMessage(error.message || 'Something went wrong. Please try again.', 'danger');
  } finally { submitButton.disabled = false; }
});

$('#project-image').addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const preview = $('#project-image-preview');
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
});

async function loadAdminProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
  if (error) return showMessage(error.message, 'danger');
  if (!data.length) {
    list.innerHTML = '<div class="text-center text-secondary py-4">No projects yet. Add your first project using the form.</div>';
    return;
  }
  list.innerHTML = data.map(p => `<div class="admin-project-row">
    <div class="d-flex align-items-center gap-3 min-w-0">
      ${p.image_url ? `<img src="${escapeHtml(p.image_url)}" alt="" class="admin-thumb">` : '<div class="admin-thumb admin-thumb-empty"><i class="bi bi-image"></i></div>'}
      <div class="min-w-0"><div class="fw-bold text-truncate">${escapeHtml(p.title)}</div><small class="text-secondary">${p.is_published ? 'Published' : 'Draft'} · ${escapeHtml(p.category || 'Project')}</small></div>
    </div><div class="d-flex gap-2 flex-shrink-0"><button class="btn btn-sm btn-outline-primary" data-edit="${p.id}">Edit</button><button class="btn btn-sm btn-outline-danger" data-delete="${p.id}">Delete</button></div>
  </div>`).join('');
  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editProject(data.find(p => p.id === btn.dataset.edit))));
  list.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => deleteProject(btn.dataset.delete)));
}

function editProject(p) {
  if (!p) return;
  editingId = p.id; currentImagePath = p.image_path || null;
  $('#project-form-heading').textContent = 'Edit project';
  $('#project-title').value = p.title || '';
  $('#project-description').value = p.description || '';
  $('#project-category').value = p.category || '';
  $('#project-technologies').value = (p.technologies || []).join(', ');
  $('#project-image-url').value = p.image_url || '';
  $('#project-github').value = p.github_url || '';
  $('#project-demo').value = p.demo_url || '';
  $('#project-video').value = p.video_url || '';
  $('#project-published').checked = !!p.is_published;
  $('#project-image').value = '';
  const preview = $('#project-image-preview');
  if (p.image_url) { preview.src = p.image_url; preview.hidden = false; } else preview.hidden = true;
  submitButton.textContent = 'Save changes';
  $('#cancel-edit').hidden = false;
  projectForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteProject(id) {
  if (!confirm('Delete this project permanently?')) return;
  const { data: project } = await supabase.from('projects').select('image_path').eq('id', id).maybeSingle();
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) return showMessage(error.message, 'danger');
  if (project?.image_path) await supabase.storage.from('project-images').remove([project.image_path]);
  showMessage('Project deleted.', 'success');
  await loadAdminProjects();
}

if (isSupabaseConfigured) {
  supabase.auth.onAuthStateChange(() => { setTimeout(requireAdmin, 0); });
}
requireAdmin();
