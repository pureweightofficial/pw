# The Keeper — editing your own website

Your website has an admin panel. You can change your business details, the
"What We Buy" wording and photos, and add customer testimonials — without
asking a developer and without touching any code.

**Your panel:** https://pureweightofficial.github.io/pw/keeper/

---

## One-time setup (about five minutes)

1. **Accept the invitation.** You'll get an email from GitHub inviting you to
   the `pw` project. Click **Accept invitation**. (If you don't have a GitHub
   account yet, it will ask you to create one first — free.)

2. **Open the panel** at the address above and bookmark it.

3. **Click "Sign In with Token".** A GitHub page opens to create your key:
   - *Repository access* → **Only select repositories** → choose **pw**
   - *Permissions* → **Contents** → **Read and write**
   - *Expiration* → **No expiration**
   - Click **Generate token**, copy it, paste it into the panel.

   You do this once. Keep a copy of the token in a password manager — if the
   browser ever forgets it, you paste the same one again. Treat it like a key
   to the shop: anyone holding it can edit the website.

That's it. No terminal, no code, no configuration.

---

## Everyday use

1. Open the panel, pick a section, edit, **Save**.
2. **Wait about five minutes.** Saving starts an automatic rebuild of the
   whole site — it is not instant, and that is normal. Then hard-refresh the
   site (Ctrl+Shift+R) to see your change.

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

- Wait the full five minutes, then hard-refresh (Ctrl+Shift+R).
- If it still hasn't changed, the site probably refused the edit — usually
  one of the rules above. Re-open the panel and check what you last changed
  against the rules, or send your developer a message saying what you edited
  and when.

---

## What still needs a developer

Design, layout, colours, fonts, the 3D scenes, navigation, page structure,
the legal pages, and anything about how the site *behaves*. The panel edits
what the site *says*, not what it *is*.
