# Borrow-a-Supply

A mobile-first web app for borrowing school supplies from a campus Borrow Room. Students reserve items and pick them up with a QR code. Staff handle the queue, and the admin manages items, people and reports.

Built with Vite and plain JavaScript, with Supabase for the database and login.

## Roles

| Role | What they do |
|---|---|
| Borrower (student) | Browse, reserve, pick up and return items, see history |
| Staff | Handle the queue, scan codes, hand out and receive items, fix stock |
| Admin | Manage items, people, settings and reports |

## Run it

```bash
npm install
cp .env.example .env     # then fill in your Supabase URL and anon key
npm run dev              # http://localhost:5173
npm run build            # output goes to dist/
```

The app sits in a phone-width column. On a desktop browser, use a 360 to 430 px device size for the best view.

## Set up Supabase

1. Create a project at supabase.com.
2. In **SQL Editor**, run these files from `supabase/` in order: `schema.sql`, `patch-1.sql`, `patch-2.sql`, `patch-4.sql`, `patch-5.sql`.
3. In **Authentication > Sign In / Providers > Email**, turn **Confirm email** off.
4. Copy the Project URL and the `anon public` key (Project Settings > API) into `.env`. Never put the `service_role` key in the app.
5. Sign up in the app, then make yourself admin in the SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@tip.edu.ph';
   ```

Only `@tip.edu.ph` emails can sign up. The admin creates staff accounts from **People > Add staff**.

## Folder map

```
src/
  main.js            routes and start-up
  router.js          hash router, route guards, back stack
  state.js           who is logged in
  styles/            tokens, base, components, screens, polish, pages
  components/        button, card, chip, input, sheet, modal, toast, tabbar, topbar, qr, icons, ...
  screens/           shared, borrower, staff, admin
  services/          all data access (Supabase) lives here
supabase/            database schema and patches
```

Screens never talk to Supabase directly. They only call the files in `src/services/`, and every function there returns `{ data, error }`. Stock changes (reserve, cancel, pickup, return) run inside Postgres functions so they stay correct when many people use the app at once.
