import fs from "fs/promises";
import path from "path";
import pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import nodeCanvas from "canvas";

import * as dotenv from 'dotenv'
dotenv.config();

import Gyazo from "gyazo-api";
const client = new Gyazo(process.env.GYAZO_TOKEN);

const filepath = process.argv[2];
const filename = path.basename(filepath, ".pdf");
console.log(filename);

const src = await fs.readFile(filepath);
const doc = await pdfjs.getDocument(src).promise;

const pages = await Promise.all(
  [...Array(doc.numPages).keys()].map((i) => doc.getPage(i + 1))
);

// ホントは中身の画像を見つけてwidth heightを取ったほうが良さそうだが、だるいので適当に拡大する
const scale = 300 / 72;
const [width, height] = pages
  .map((page) => {
    const viewport = page.getViewport();
    const [, , w, h] = viewport.viewBox;
    return [w, h];
  })
  .reduce(
    ([width, height], [w, h]) => {
      return [Math.max(width, w), Math.max(height, h)];
    },
    [0, 0]
  )
  .map((len) => len * scale);
console.log({ width, height });

const canvas = nodeCanvas.createCanvas(width, height);
const context = canvas.getContext("2d");

const json = { pages: [] };

try {
  await fs.stat(`out/${filename}`);
} catch {
  await fs.mkdir(`out/${filename}`, { recursive: true });
}

const keta = pages.length.toString().length;
const pad = (num) => num.toString().padStart(keta, "0");

for (let [i, page] of pages.map((page, i) => [i, page])) {
  const id = pad(i);

  await page.render({
    canvasContext: context,
    viewport: page.getViewport({ scale }),
  }).promise;

  const b = canvas.toBuffer();
  const file = `out/${filename}/${id}.jpg`;

  await fs.writeFile(file, b);
  const res = await client.upload(file);
  const url = res.data.permalink_url;
  console.log(id, pages.length, url);

  const p = pad(i > 0 ? i - 1 : i);
  const n = pad(i < pages.length - 1 ? i + 1 : i);
  const title = id;
  // prettier-ignore
  const lines = [
    title,
    `[${p}] [${n}]`,
    `[[${url}]]`,
    `[${p}] [${n}]`,
  ];

  json.pages.push({ title, lines });
}

fs.writeFile(`out/${filename}.json`, JSON.stringify(json));
