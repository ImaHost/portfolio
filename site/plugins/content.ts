/**
 * 저장소의 README를 읽어 사이트 데이터로 바꾼다(Node 쪽 — 빌드 · 개발 서버).
 * 결과는 가상 모듈 `virtual:site-data`로 나가고, 브라우저에는 변환된 트리(JSON)만 간다.
 * 변환 규칙 · 필수 구조는 docs/design/0004 §4. 필수 구조가 없으면 빌드를 멈춘다.
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toHast } from 'mdast-util-to-hast';
import { toString as mdText } from 'mdast-util-to-string';
import { toString as hastText } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';
import GithubSlugger from 'github-slugger';
import type * as M from 'mdast';
import type * as H from 'hast';
import type { SiteConfig } from '../site.config';
import type { DemoLink, Image, MetaRow, Profile, Project, SiteData, SkillGroup, TocItem } from '../src/types';

const VIRTUAL_ID = 'virtual:site-data';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

export interface ContentOptions {
  repoRoot: string;
  config: SiteConfig;
}

class ContentError extends Error {
  constructor(file: string, message: string) {
    super(`[portfolio-content] ${file}: ${message}`);
  }
}

const parser = unified().use(remarkParse).use(remarkGfm);

/* ------------------------------------------------------------------ 진입점 */

export function loadSiteData({ repoRoot, config }: ContentOptions): { data: SiteData; files: string[] } {
  const ctx = new Context(repoRoot, config);
  const rootFile = path.join(repoRoot, 'README.md');
  const { profile, entries } = readProfile(ctx, rootFile);
  const projects = entries.map((entry) => readProject(ctx, entry));

  return {
    data: {
      config: {
        base: config.base,
        origin: config.origin,
        indexable: config.indexable,
        repoUrl: config.repoUrl,
        email: config.email,
        pdf: config.pdf,
      },
      profile,
      projects,
      assets: [...ctx.assets].sort(),
    },
    files: [rootFile, ...entries.map((e) => path.join(repoRoot, e.id, 'README.md'))],
  };
}

export function contentPlugin(options: ContentOptions): Plugin {
  return {
    name: 'portfolio-content',
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      const { data, files } = loadSiteData(options);
      for (const file of files) this.addWatchFile(file);
      return `export default ${JSON.stringify(data)};`;
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('README.md')) return undefined;
      const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

/* ------------------------------------------------------------------ 주소 · 파일 */

class Context {
  readonly assets = new Set<string>();

  constructor(
    readonly repoRoot: string,
    readonly config: SiteConfig,
  ) {}

  /** README 안 링크 → 사이트 주소. folder는 README가 놓인 폴더(루트면 '') */
  link(href: string, folder: string): { href: string; external: boolean } {
    if (href.startsWith('#')) return { href, external: false };
    for (const prefix of this.config.readmeSitePrefixes) {
      if (href.startsWith(prefix)) return { href: this.config.base + href.slice(prefix.length), external: false };
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return { href, external: true };
    return { href: this.config.base + repoPath(folder, href), external: false };
  }

  /** README 안 이미지 → 사이트 주소 + 크기. 파일이 없으면 빌드를 멈춘다 */
  image(src: string, folder: string, readme: string): Pick<Image, 'src' | 'width' | 'height'> {
    if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return { src, width: null, height: null };
    const rel = repoPath(folder, src);
    const file = path.join(this.repoRoot, rel);
    if (!fs.existsSync(file)) throw new ContentError(readme, `이미지 파일이 없습니다 — ${src}`);
    this.assets.add(rel);
    const size = pngSize(file);
    return { src: this.config.base + rel, width: size?.width ?? null, height: size?.height ?? null };
  }

  isDemo(siteHref: string): boolean {
    return siteHref.startsWith(this.config.base + 'demo/');
  }
}

function repoPath(folder: string, href: string): string {
  const joined = path.posix.normalize(path.posix.join(folder, href));
  if (joined.startsWith('..')) throw new Error(`저장소 밖을 가리키는 경로입니다 — ${href}`);
  return joined === '.' ? '' : joined.replace(/^\.\//, '');
}

function pngSize(file: string): { width: number; height: number } | null {
  if (!file.toLowerCase().endsWith('.png')) return null;
  const fd = fs.openSync(file, 'r');
  try {
    const head = Buffer.alloc(24);
    fs.readSync(fd, head, 0, 24, 0);
    if (head.toString('ascii', 1, 4) !== 'PNG') return null;
    return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}

/* ------------------------------------------------------------------ 루트 README → 소개 · 프로젝트 순서 · 기술 */

interface Entry {
  id: string;
  name: string;
  period: string;
  role: string;
  summary: string;
}

const PROJECT_TABLE_HEAD = ['프로젝트', '기간', '역할', '한 줄 요약'];

function readProfile(ctx: Context, file: string): { profile: Profile; entries: Entry[] } {
  const nodes = parse(file).children;

  const h1 = nodes[0];
  if (h1?.type !== 'heading' || h1.depth !== 1) throw new ContentError(file, '첫 줄이 `# 이름 — …` 제목이 아닙니다');
  const name = mdText(h1).split(' — ')[0].trim();

  const tableAt = nodes.findIndex((n) => n.type === 'table' && sameHead(n, PROJECT_TABLE_HEAD));
  if (tableAt < 0) throw new ContentError(file, `머리글이 \`${PROJECT_TABLE_HEAD.join(' | ')}\`인 표가 없습니다`);
  const table = nodes[tableAt] as M.Table;

  // 표 앞 문단 — 첫 문장을 큰 제목으로, 나머지는 소개 문단으로
  const lines = nodes
    .slice(1, tableAt)
    .filter((n): n is M.Paragraph => n.type === 'paragraph')
    .flatMap((p) => mdText(p).split('\n'))
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new ContentError(file, '제목과 표 사이에 소개 문단이 없습니다');
  const first = lines[0].match(/^(.+?[.!?])\s+(.+)$/);
  const headline = first ? first[1] : lines[0];
  const intro = first ? [first[2], ...lines.slice(1)] : lines.slice(1);

  const entries = table.children.slice(1).map((row): Entry => {
    const [nameCell, period, role, summary] = row.children;
    const link = findFirst<M.Link>(nameCell, 'link');
    if (!link) throw new ContentError(file, `프로젝트 표의 이름 칸에 폴더 링크가 없습니다 — ${mdText(nameCell)}`);
    const id = repoPath('', link.url).replace(/\/$/, '');
    if (!/^[\w-]+$/.test(id)) throw new ContentError(file, `프로젝트 링크는 저장소 폴더여야 합니다 — ${link.url}`);
    return { id, name: mdText(link), period: cell(period), role: cell(role), summary: cell(summary) };
  });

  // 표 뒤의 시연 링크 문단
  let demo: Profile['demo'] = null;
  for (const n of nodes.slice(tableAt + 1)) {
    if (n.type !== 'paragraph') continue;
    const links = demoLinks(ctx, n, '');
    if (links.length === 0) continue;
    demo = { ...links[0], note: afterDash(mdText(n)) };
    break;
  }

  // ## 쓰는 기술 → 목록 → (뒤 문단은 안내)
  const skillsAt = nodes.findIndex((n) => n.type === 'heading' && n.depth === 2 && mdText(n).trim() === '쓰는 기술');
  const list = nodes[skillsAt + 1];
  if (skillsAt < 0 || list?.type !== 'list') throw new ContentError(file, '`## 쓰는 기술` 다음에 목록이 없습니다');
  const skills = list.children.map((item) => readSkill(file, item));
  const noteNodes = nodes.slice(skillsAt + 2).filter((n) => n.type === 'paragraph');
  const note = finish(ctx, mdToHast({ type: 'root', children: noteNodes }), '', file).tree;

  return { profile: { name, headline, intro, demo, skills, note }, entries };
}

function readSkill(file: string, item: M.ListItem): SkillGroup {
  const para = item.children[0];
  const strong = para?.type === 'paragraph' ? para.children[0] : undefined;
  if (para?.type !== 'paragraph' || strong?.type !== 'strong') {
    throw new ContentError(file, `기술 목록은 \`**묶음**: 기술, 기술\` 꼴이어야 합니다 — ${mdText(item)}`);
  }
  const label = mdText(strong).trim();
  const rest = mdText(para).slice(mdText(strong).length).replace(/^\s*:\s*/, '');
  const dash = rest.indexOf(' — ');
  const list = dash < 0 ? rest : rest.slice(0, dash);
  return { label, items: splitTopLevel(list), note: dash < 0 ? null : rest.slice(dash + 3).trim() };
}

/** 괄호 안 쉼표는 나누지 않는다 — `Python(FastAPI, Celery), Java` → 2개 */
function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of text) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      out.push(buf);
      buf = '';
    } else buf += ch;
  }
  out.push(buf);
  return out.map((s) => s.trim()).filter(Boolean);
}

/* ------------------------------------------------------------------ 프로젝트 README → 상세 */

const META_TABLE_HEAD = ['항목', '내용'];

function readProject(ctx: Context, entry: Entry): Project {
  const file = path.join(ctx.repoRoot, entry.id, 'README.md');
  if (!fs.existsSync(file)) throw new ContentError(file, '루트 README 표에 있는 프로젝트의 README가 없습니다');
  const nodes = parse(file).children;

  const h1 = nodes[0];
  if (h1?.type !== 'heading' || h1.depth !== 1) throw new ContentError(file, '첫 줄이 `# 제목`이 아닙니다');
  const title = mdText(h1).trim();

  const metaTable = nodes.find((n): n is M.Table => n.type === 'table' && sameHead(n, META_TABLE_HEAD));
  if (!metaTable) throw new ContentError(file, `머리글이 \`${META_TABLE_HEAD.join(' | ')}\`인 머리 표가 없습니다`);

  // 시연 링크: README의 `> ▶ …` 인용에서, 없으면 머리 표의 칸에서(그 행은 머리 정보에서 뺀다)
  const quote = nodes.find((n): n is M.Blockquote => n.type === 'blockquote' && demoLinks(ctx, n, entry.id).length > 0);
  let demo: DemoLink[] = quote ? demoLinks(ctx, quote, entry.id) : [];
  const demoNote = quote ? afterDash(mdText(quote)) : null;
  let demoRow: M.TableRow | null = null;
  if (!quote) {
    demoRow = metaTable.children.slice(1).find((r) => demoLinks(ctx, r.children[1], entry.id).length > 0) ?? null;
    if (demoRow) demo = demoLinks(ctx, demoRow.children[1], entry.id);
  }

  const meta: MetaRow[] = metaTable.children
    .slice(1)
    .filter((row) => row !== demoRow)
    .map((row) => ({
      label: cell(row.children[0]),
      value: finish(ctx, inlineHast(row.children[1]), entry.id, file).tree,
    }));
  const stackRow = metaTable.children.slice(1).find((r) => cell(r.children[0]) === '스택');
  const stack = stackRow ? cell(stackRow.children[1]).split(' · ').map((s) => s.trim()).filter(Boolean) : [];

  const bodyNodes = nodes.filter((n) => n !== h1 && n !== metaTable && n !== quote && n.type !== 'thematicBreak');
  const { tree: body, toc, firstImage } = finish(ctx, mdToHast({ type: 'root', children: bodyNodes }), entry.id, file);

  return {
    id: entry.id,
    name: entry.name,
    title,
    period: entry.period,
    role: entry.role,
    summary: entry.summary,
    stack,
    meta,
    demo,
    demoNote,
    cover: firstImage,
    toc,
    body,
  };
}

function demoLinks(ctx: Context, node: M.Nodes, folder: string): DemoLink[] {
  const out: DemoLink[] = [];
  visit(node, 'link', (link: M.Link) => {
    const { href } = ctx.link(link.url, folder);
    if (!ctx.isDemo(href)) return;
    const text = mdText(link).replace(/^▶\s*/, '').trim();
    out.push({ href, label: text.includes('시연') ? text : `${text} 시연` });
  });
  return out;
}

/* ------------------------------------------------------------------ hast 다듬기 */

interface Finished {
  tree: H.Root;
  toc: TocItem[];
  firstImage: Image | null;
}

/**
 * 링크 · 이미지 주소를 사이트 주소로, 이미지만 든 표를 캡처 묶음으로, 이미지만 든 문단을 캡처 하나로,
 * 제목에 id를, 첫 문단에 lead를 붙이고 위치 정보를 지운다.
 */
function finish(ctx: Context, tree: H.Root, folder: string, readme: string): Finished {
  let firstImage: Image | null = null;

  visit(tree, 'element', (el: H.Element) => {
    if (el.tagName === 'img') {
      const resolved = ctx.image(String(el.properties.src ?? ''), folder, readme);
      el.properties = {
        ...el.properties,
        src: resolved.src,
        width: resolved.width ?? undefined,
        height: resolved.height ?? undefined,
        loading: 'lazy',
        decoding: 'async',
      };
      firstImage ??= { ...resolved, alt: String(el.properties.alt ?? '') };
    }
    if (el.tagName === 'a') {
      const { href, external } = ctx.link(String(el.properties.href ?? ''), folder);
      el.properties = { ...el.properties, href, ...(external ? { target: '_blank', rel: ['noopener', 'noreferrer'] } : {}) };
    }
  });

  tree.children = tree.children.map((node) => {
    if (node.type !== 'element') return node;
    if (node.tagName === 'table') return imageTableToGallery(node) ?? node;
    if (node.tagName === 'p') {
      const only = onlyImages(node);
      if (only?.length === 1) return shot(only[0], []);
    }
    return node;
  });

  const slugger = new GithubSlugger();
  const toc: TocItem[] = [];
  for (const node of tree.children) {
    if (node.type !== 'element' || (node.tagName !== 'h2' && node.tagName !== 'h3')) continue;
    const text = hastText(node).trim();
    const id = slugger.slug(text);
    node.properties = { ...node.properties, id };
    if (node.tagName === 'h2') toc.push({ id, text });
  }

  const first = tree.children.find((n): n is H.Element => n.type === 'element');
  if (first?.tagName === 'p') first.properties = { ...first.properties, className: ['lead'] };

  visit(tree, (node) => {
    delete node.position;
  });
  return { tree, toc, firstImage };
}

/** 칸마다 이미지만 든 표 → 캡처 묶음. 머리글 칸이 캡처 설명이 된다. 해당하지 않으면 null */
function imageTableToGallery(table: H.Element): H.Element | null {
  const head = childEl(table, 'thead');
  const body = childEl(table, 'tbody');
  if (!head || !body) return null;
  const captions = childEls(childEl(head, 'tr'), 'th');
  const rows = childEls(body, 'tr');
  if (rows.length === 0) return null;

  const figures: H.Element[] = [];
  for (const row of rows) {
    const cells = childEls(row, 'td');
    for (const [i, td] of cells.entries()) {
      const images = onlyImages(td);
      if (!images || images.length === 0) return null;
      images.forEach((img, j) => figures.push(shot(img, j === 0 ? (captions[i]?.children ?? []) : [])));
    }
  }
  return {
    type: 'element',
    tagName: 'div',
    properties: { className: ['gallery'], dataCols: String(captions.length) },
    children: figures,
  };
}

function shot(img: H.Element, caption: H.ElementContent[]): H.Element {
  const hasCaption = caption.some((c) => hastText(c).trim() !== '');
  return {
    type: 'element',
    tagName: 'figure',
    properties: { className: ['shot'] },
    children: hasCaption ? [img, { type: 'element', tagName: 'figcaption', properties: {}, children: caption }] : [img],
  };
}

/** 공백 말고는 이미지만 들어 있으면 그 이미지들, 아니면 null */
function onlyImages(el: H.Element): H.Element[] | null {
  const images: H.Element[] = [];
  for (const c of el.children) {
    if (c.type === 'text' && c.value.trim() === '') continue;
    if (c.type === 'element' && c.tagName === 'img') images.push(c);
    else return null;
  }
  return images;
}

function childEl(el: H.Element | undefined, tag: string): H.Element | undefined {
  return el?.children.find((c): c is H.Element => c.type === 'element' && c.tagName === tag);
}

function childEls(el: H.Element | undefined, tag: string): H.Element[] {
  return el ? el.children.filter((c): c is H.Element => c.type === 'element' && c.tagName === tag) : [];
}

/* ------------------------------------------------------------------ mdast 도우미 */

function parse(file: string): M.Root {
  return parser.parse(fs.readFileSync(file, 'utf8'));
}

function mdToHast(root: M.Root): H.Root {
  return toHast(root) as H.Root;
}

function inlineHast(c: M.TableCell): H.Root {
  const p = toHast({ type: 'paragraph', children: c.children }) as H.Element;
  return { type: 'root', children: p.children };
}

function cell(c: M.TableCell | undefined): string {
  return c ? mdText(c).trim() : '';
}

function sameHead(table: M.Table, head: string[]): boolean {
  const cells = table.children[0]?.children.map((c) => cell(c)) ?? [];
  return cells.length === head.length && cells.every((c, i) => c === head[i]);
}

function findFirst<T extends M.Nodes>(node: M.Nodes, type: T['type']): T | null {
  let found: T | null = null;
  visit(node, type, (n) => {
    found ??= n as T;
  });
  return found;
}

/** `… — 설명` 에서 설명 */
function afterDash(text: string): string | null {
  const i = text.indexOf(' — ');
  return i < 0 ? null : text.slice(i + 3).trim() || null;
}
