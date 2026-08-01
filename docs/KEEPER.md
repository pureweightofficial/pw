# The Keeper — editing your own website

Your website has an admin panel. You can change your business details, the
"What We Buy" wording and photos, and add customer testimonials — without
asking a developer and without touching any code.

**Your panel:** https://pureweightofficial.github.io/pw/keeper/

---

## One-time setup (about five minutes)

1. **Accept the invitation.** You'll get an email from GitHub inviting you to
   the `pw` project. Click **Accept invitation**. (If you don't have a GitHub
   account yet, it will ask you to create one first — free. If you already own
   the `pureweightofficial` account, skip this step.)

2. **Open the panel** at the address above and bookmark it.

3. **Follow the panel's own instructions.** The sign-in screen has a
   "How do I get my access key?" section that walks you through creating your
   key on GitHub — four clicks, no terminal. Paste the key in and you're in.

   Keep a copy of the key in a password manager — if the browser ever forgets
   it, you paste the same one again. Treat it like a key to the shop: anyone
   holding it can edit the website.

## Everyday use

1. Open the panel, pick a section, edit, **Save & Publish**.
2. **The panel tells you what is happening.** After saving it shows
   "Publishing…" while the site rebuilds itself (a few minutes), then
   "Published". Allow up to ten more minutes for the old page to leave the
   cache, then hard-refresh the site (Ctrl+Shift+R).
3. If something in your edit breaks a rule, the panel marks the exact field
   in red BEFORE saving — nothing is published until it is fixed.

### What the sections do

- **Business Details** — phone, hours, email, address, credentials.
  **A field you fill in appears on the site as fact. A field you leave empty
  shows as a visible "[INSERT …]" slot.** That is deliberate: the site never
  pretends to know something you have not confirmed. There is no
  "mark as verified" button — filling the field in *is* the verification.
- **What We Buy** — the four buying panels' wording, bullet points and
  photos. The panels themselves and their titles are fixed.
- **Testimonials** — real customer quotes, each with the customer's name and
  a line of context. Anonymous quotes will not publish.

### Rules the site enforces on its own

These are not suggestions — the site will refuse to publish and nothing will
change until they are met:

- **Credentials need evidence.** "Insurance" only appears once the insurer is
  named too; a review score only appears with a link to where it lives.
- **No unverifiable promises, anywhere.** Phrases like *best prices*,
  *guaranteed*, *same-day*, *no fees*, or percentages are refused in every
  text field — including inside customer quotes. If you want to make a claim
  like that, talk to your developer about what evidence puts it on the site.
- **Every photo needs a one-line description** (what a screen reader says
  out loud), and photos must follow three rules: no identifiable people, no
  branded or serial-numbered bullion, no photos of someone else's premises.

### If your change doesn't appear

- Wait for the panel to say "Published", give the cache ten minutes, then
  hard-refresh (Ctrl+Shift+R).
- If the panel says the site refused the change, it links to the reason —
  send that link to your developer if it doesn't make sense.

---

## What still needs a developer

Design, layout, colours, fonts, the 3D scenes, navigation, page structure,
the legal pages, and anything about how the site *behaves*. The panel edits
what the site *says*, not what it *is*.
