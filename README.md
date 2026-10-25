# Invoice maker

A small web page for making invoices. Fill in the boxes on the left, watch the invoice update on the right, and press **Download PDF**. The file is saved as `Invoice for <customer name>.pdf`.

- Everything runs in the browser. Nothing is sent anywhere.
- What you type is remembered in that browser, so your business details are there next time.
- **New invoice** clears the customer and items but keeps your details and payment instructions (with an Undo, in case you click it by mistake).
- Long invoices carry on to a second page automatically.
- Built with TypeScript and [Vite](https://vite.dev); PDFs are made with [jsPDF](https://github.com/parallax/jsPDF) using the Roboto typeface, so text in the PDF is real, selectable text.

## Putting it on GitHub Pages

1. Create a new repository on GitHub (this one is `nwt-invoice-maker`).
2. Add all of these files to it, including the hidden `.github` folder and `package-lock.json`. From a terminal in this folder:
   ```sh
   git init
   git add .
   git commit -m "Invoice maker"
   git branch -M main
   git remote add origin https://github.com/<your-username>/nwt-invoice-maker.git
   git push -u origin main
   ```
   If you'd rather upload through the GitHub website, drag the files in with **Add file → Upload files**. Some computers hide the `.github` folder; if it doesn't get uploaded, use **Add file → Create new file**, name it `.github/workflows/deploy.yml`, and paste in the contents of that file.
3. In the repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Go to the **Actions** tab. The "Deploy to GitHub Pages" workflow builds and publishes the site (re-run it if it ran before step 3). After a minute or two your page is at
   `https://<your-username>.github.io/nwt-invoice-maker/`

Every time you push a change to `main`, the site rebuilds itself.

## Working on it locally

You need [Node.js](https://nodejs.org) 20.19 or newer.

```sh
npm install
npm run dev      # opens a local copy that reloads as you edit
npm run build    # type-checks and builds the site into dist/
```

## Where things are

| File | What it does |
| --- | --- |
| `index.html` | The form and page structure |
| `src/main.ts` | Connects the form to the preview and the download button |
| `src/layout.ts` | Where everything sits on the invoice: positions, sizes and colours |
| `src/render-svg.ts` | Draws the layout as the on-screen preview |
| `src/render-pdf.ts` | Draws the same layout into the PDF |
| `src/calc.ts` | Totals, tax, number and date formatting, and the file name |
| `src/defaults.ts` | What the form starts with on first visit |
| `src/style.css` | How the page looks |

The preview and the PDF are both drawn from `src/layout.ts`, so they always match. To change the invoice's look (colours, column widths, font sizes), edit that file.

### Pre-filling your business details

To have your name, address, phone and email filled in for anyone who opens the page, put them in `DEFAULT_BUSINESS` in `src/defaults.ts`. Bear in mind the site is public, so anything there can be read by anyone who looks at the page's code. Leaving it blank is fine: each browser remembers what was typed into it.

### Typing in the boxes

Every box takes any text. What you type is printed as you typed it. The exception is a unit price, discount, tax rate or shipping amount that's just a number, which gets tidied up (`200` prints as `£200.00`).

For the sums, the first number in a box is used and anything else is ignored: `10m` counts as 10, `£12.50 per bag` as 12.50, `20% VAT` as 20, and `Free` as nothing. An item with no quantity counts as one of it.

Discount, tax rate, shipping and remarks are left off the invoice when their box is blank.

### Totals

- **Subtotal** is the sum of the item totals.
- **Total tax** is (subtotal − discount) × tax rate.
- **Balance due** is subtotal − discount + total tax + shipping.

## Licences

Roboto is © Google, used under the Apache License 2.0 (see `src/fonts/LICENSE-Roboto.txt`).
