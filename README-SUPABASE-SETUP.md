# Sanithu Portfolio – Supabase Admin Setup

Your existing Bootstrap portfolio pages and assets are kept. The Projects pages now read published projects from Supabase. The admin area is at `admin.html`.

## 1. Create a Supabase project

1. Open https://supabase.com and create a project.
2. In Project Settings → API (or the API Keys page), copy the **Project URL** and the **anon / publishable key**.
3. Open `js/supabase-config.js` and replace:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`
4. Never use the `service_role` or secret key in this website. Frontend keys are public; database and Storage access are protected by RLS policies.

## 2. Create your admin user

1. In Supabase, open Authentication → Users → Add user.
2. Create your admin email and a strong password. Do not enable public sign-ups for this portfolio.
3. Copy the user's UUID from the Users list.

## 3. Create database, security policies and image storage

1. Open SQL Editor in Supabase.
2. Open `supabase-setup.sql` in this project.
3. Replace `ADMIN_USER_UUID` at the bottom with the UUID copied in step 2 (keep the single quotes).
4. Run the complete SQL script.

The script creates the `projects` table, an explicit admin allow-list, Row Level Security policies, and a public-read `project-images` Storage bucket. Only the allow-listed admin can insert, update, or delete projects and upload/delete project images. Public visitors can only read published projects and view project images.

## 4. Use the dashboard

1. Run the site using a local web server (not by double-clicking HTML files). For example, in the project folder run `python -m http.server 5500`.
2. Open `http://localhost:5500/admin.html`.
3. Sign in with the admin email and password created in Supabase.
4. Add a title, description, technologies, optional image, GitHub URL and live demo URL. Choose whether to publish immediately.
5. Open `projects.html` or `view.html` to see published projects.

## 5. Deploy

Upload the complete project folder to your static hosting provider (GitHub Pages, Netlify, etc.). Keep the `js/`, `css/`, `assets/`, and HTML files together. Update Supabase Auth URL Configuration → Site URL and Redirect URLs to include your deployed website URL.

## Security notes

- The frontend only contains the Supabase anon/publishable key, which is designed to be public.
- Do not add a service-role/secret key to HTML or JavaScript.
- The SQL policies require an authenticated user ID present in `portfolio_admins` for all management actions.
- Disable public user registration in Supabase Authentication settings. Create admin users manually.
- A user who is not listed in `portfolio_admins` cannot use the dashboard, even if they have a valid Supabase login.
- Uploaded images are public because they are portfolio images. Do not upload private files.

## Troubleshooting

- **Supabase is not configured:** check the Project URL and anon/publishable key in `js/supabase-config.js`.
- **Login works but dashboard says not authorised:** confirm the UUID in `portfolio_admins` exactly matches the user UUID in Authentication → Users.
- **Project upload fails:** confirm you ran the full SQL script and the `project-images` bucket exists.
- **Projects do not appear:** confirm the project has `Publish on website` enabled and check the browser console for errors.
