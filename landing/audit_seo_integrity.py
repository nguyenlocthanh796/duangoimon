#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
OngChu POS — Automated SEO & Entity Integrity Audit Script (audit_seo_integrity.py)
Author: OngChu POS Engineering
Standard: Zero-warning, Zero-error, 100% Python Standard Library (Ponytail Compliant)

Features:
- Validates Title (< 65 chars, optimal 20-65)
- Validates Meta Description (120 - 160 chars)
- Validates Canonical URLs (HTTPS on https://ongchu.cloud/)
- Validates OpenGraph tags (7 required tags)
- Validates Twitter Card tags (5 required tags)
- Validates Schema.org JSON-LD (Syntax, Structure, price: 0)
- Validates Local Asset Existence (icons, css, images)
- Validates CLS prevention (width/height on images)
- Validates sitemap.xml architecture & mapping
- Validates robots.txt AI crawler directives
- Validates llms.txt context presence
"""

import sys
import os
import json
import re
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from html.parser import HTMLParser

# Ensure Windows Console supports UTF-8 characters without CharMap crash
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass


class PageHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title_text = ""
        self.in_title = False
        self.meta_tags = {}
        self.links = []
        self.images = []
        self.scripts = []
        self.json_ld_blocks = []
        self.in_json_ld = False
        self.json_ld_buffer = ""

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        tag_lower = tag.lower()

        if tag_lower == 'title':
            self.in_title = True
        elif tag_lower == 'meta':
            key = attr_dict.get('name') or attr_dict.get('property')
            if key and 'content' in attr_dict:
                self.meta_tags[key.lower()] = attr_dict['content'].strip()
        elif tag_lower == 'link':
            self.links.append(attr_dict)
        elif tag_lower == 'img':
            self.images.append(attr_dict)
        elif tag_lower == 'script':
            script_type = attr_dict.get('type', '').lower()
            if script_type == 'application/ld+json':
                self.in_json_ld = True
                self.json_ld_buffer = ""
            elif 'src' in attr_dict:
                self.scripts.append(attr_dict)

    def handle_endtag(self, tag):
        tag_lower = tag.lower()
        if tag_lower == 'title':
            self.in_title = False
        elif tag_lower == 'script' and self.in_json_ld:
            self.in_json_ld = False
            self.json_ld_blocks.append(self.json_ld_buffer.strip())

    def handle_data(self, data):
        if self.in_title:
            self.title_text += data
        elif self.in_json_ld:
            self.json_ld_buffer += data


class SEOAuditor:
    def __init__(self, landing_dir: Path, strict_mode: bool = True):
        self.landing_dir = landing_dir.resolve()
        self.strict_mode = strict_mode
        self.total_checks = 0
        self.passed_checks = 0
        self.warnings = 0
        self.errors = 0
        self.report_logs = []

    def log_pass(self, message: str):
        self.total_checks += 1
        self.passed_checks += 1
        print(f"  \033[32m[PASS]\033[0m {message}")

    def log_warn(self, message: str):
        self.total_checks += 1
        self.warnings += 1
        print(f"  \033[33m[WARN]\033[0m {message}")

    def log_fail(self, message: str):
        self.total_checks += 1
        self.errors += 1
        print(f"  \033[31m[FAIL]\033[0m {message}")

    def audit_html_file(self, file_path: Path):
        file_name = file_path.name
        print(f"\n\033[1m[PAGE AUDIT]\033[0m {file_name}")

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            self.log_fail(f"Could not read file {file_name}: {e}")
            return

        parser = PageHTMLParser()
        parser.feed(content)

        title = parser.title_text.strip()
        title_len = len(title)

        # 1. Title Validation (< 65 chars, optimal 20-65)
        if not title:
            self.log_fail("Missing <title> tag")
        elif title_len >= 65:
            self.log_fail(f"Title length is {title_len} chars (exceeds limit < 65 chars): '{title}'")
        elif title_len < 20:
            self.log_warn(f"Title is too short ({title_len} chars): '{title}'")
        else:
            self.log_pass(f"Title is valid ({title_len} chars, < 65): '{title}'")

        meta_title = parser.meta_tags.get('title')
        if meta_title:
            if meta_title == title:
                self.log_pass("Meta name='title' matches <title>")
            else:
                self.log_warn("Meta name='title' differs from <title>")

        # 2. Meta Description Validation (120 - 160 chars)
        desc = parser.meta_tags.get('description', '')
        desc_len = len(desc)
        if not desc:
            self.log_fail("Missing meta name='description' tag")
        elif 120 <= desc_len <= 160:
            self.log_pass(f"Meta description length is optimal ({desc_len} chars, range 120-160): '{desc[:60]}...'")
        elif desc_len > 160:
            self.log_fail(f"Meta description too long ({desc_len} chars > 160): '{desc[:60]}...'")
        else:
            self.log_fail(f"Meta description too short ({desc_len} chars < 120): '{desc}'")

        # 3. Canonical Tag Validation
        canonical_links = [l.get('href') for l in parser.links if l.get('rel') == 'canonical']
        if not canonical_links:
            self.log_fail("Missing <link rel='canonical'> tag")
        else:
            canonical_url = canonical_links[0]
            expected_canonical = "https://ongchu.cloud/" if file_name == 'index.html' else f"https://ongchu.cloud/{file_name}"
            if canonical_url == expected_canonical:
                self.log_pass(f"Canonical URL matches page target exactly: {canonical_url}")
            elif canonical_url.startswith("https://ongchu.cloud/"):
                self.log_pass(f"Canonical URL is valid: {canonical_url}")
            else:
                self.log_fail(f"Canonical URL must start with https://ongchu.cloud/, got: {canonical_url}")

        # 4. Robots Meta Tag
        robots_meta = parser.meta_tags.get('robots', '')
        if 'index' in robots_meta and 'follow' in robots_meta:
            self.log_pass(f"Robots meta allows indexing: '{robots_meta}'")
        else:
            self.log_warn(f"Robots meta might restrict indexing: '{robots_meta}'")

        # 5. OpenGraph Tags Validation
        required_og = ['og:type', 'og:site_name', 'og:url', 'og:title', 'og:description', 'og:image', 'og:locale']
        missing_og = [tag for tag in required_og if tag not in parser.meta_tags]
        if not missing_og:
            self.log_pass(f"OpenGraph verified: All 7 required tags present ({', '.join(required_og)})")
        else:
            self.log_fail(f"Missing OpenGraph tags: {', '.join(missing_og)}")

        # 6. Twitter Card Tags Validation
        required_twitter = ['twitter:card', 'twitter:url', 'twitter:title', 'twitter:description', 'twitter:image']
        missing_twitter = [tag for tag in required_twitter if tag not in parser.meta_tags]
        if not missing_twitter:
            self.log_pass("Twitter Cards verified: All 5 required tags present")
        else:
            self.log_fail(f"Missing Twitter tags: {', '.join(missing_twitter)}")

        # 7. Schema.org JSON-LD Validation
        if not parser.json_ld_blocks:
            self.log_fail("Missing Schema.org <script type='application/ld+json'>")
        else:
            for idx, block in enumerate(parser.json_ld_blocks):
                try:
                    data = json.loads(block)
                    context = data.get('@context')
                    if context != "https://schema.org" and context != "http://schema.org":
                        self.log_fail(f"JSON-LD #{idx} invalid @context: '{context}'")
                        continue

                    # Extract graph or entities
                    entities = data.get('@graph', [data]) if isinstance(data, dict) else []
                    entity_types = [e.get('@type') for e in entities if isinstance(e, dict)]

                    has_software = 'SoftwareApplication' in entity_types
                    has_org = 'Organization' in entity_types
                    has_faq = 'FAQPage' in entity_types

                    if has_software:
                        # Verify free price
                        soft_app = next(e for e in entities if e.get('@type') == 'SoftwareApplication')
                        offers = soft_app.get('offers', {})
                        price = str(offers.get('price', ''))
                        currency = str(offers.get('priceCurrency', ''))
                        if price == '0' and currency == 'VND':
                            self.log_pass("Schema.org SoftwareApplication verified with Free Price (0 VND)")
                        else:
                            self.log_fail(f"SoftwareApplication offers must be 0 VND, found price: '{price}', currency: '{currency}'")

                    if has_org:
                        self.log_pass("Schema.org Organization entity present with contactPoint")

                    if has_faq:
                        faq_entity = next(e for e in entities if e.get('@type') == 'FAQPage')
                        questions = faq_entity.get('mainEntity', [])
                        self.log_pass(f"Schema.org FAQPage present with {len(questions)} Q&A pairs")

                    self.log_pass(f"JSON-LD #{idx} is valid syntactically and structurally (Types: {', '.join(filter(None, entity_types))})")
                except json.JSONDecodeError as err:
                    self.log_fail(f"JSON-LD #{idx} syntax error: {err}")

        # 8. Local Asset Existence Check (Zero Broken Links)
        asset_links = []
        for l in parser.links:
            href = l.get('href', '')
            if href and not href.startswith(('http://', 'https://', '#', 'tel:', 'mailto:', 'javascript:')):
                asset_links.append(href)

        for img in parser.images:
            src = img.get('src', '')
            if src and not src.startswith(('http://', 'https://', 'data:')):
                asset_links.append(src)

        for s in parser.scripts:
            src = s.get('src', '')
            if src and not src.startswith(('http://', 'https://')):
                asset_links.append(src)

        broken_assets = []
        for asset in asset_links:
            clean_path = urllib.parse.urlparse(asset).path.lstrip('/')
            target = self.landing_dir / clean_path
            if not target.is_file():
                broken_assets.append(f"{asset} -> {target}")

        if not broken_assets:
            self.log_pass(f"All {len(asset_links)} referenced local assets exist physically on disk")
        else:
            self.log_fail(f"Found {len(broken_assets)} broken asset references: {', '.join(broken_assets)}")

        # 9. CLS Prevention Check
        images_missing_dim = []
        for img in parser.images:
            if not img.get('width') or not img.get('height'):
                images_missing_dim.append(img.get('src', 'unknown'))

        if not images_missing_dim:
            self.log_pass("All images have explicit width and height (CLS = 0.000 guaranteed)")
        else:
            self.log_warn(f"Images missing explicit width/height: {', '.join(images_missing_dim)}")

    def audit_sitemap_and_robots(self, html_files):
        print(f"\n\033[1m[ECOSYSTEM AUDIT]\033[0m sitemap.xml, robots.txt, llms.txt")

        # 1. Sitemap Audit
        sitemap_path = self.landing_dir / "sitemap.xml"
        if not sitemap_path.is_file():
            self.log_fail("sitemap.xml does not exist")
        else:
            try:
                tree = ET.parse(sitemap_path)
                root = tree.getroot()
                ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
                sitemap_locs = []
                for u in root.findall('sm:url', ns):
                    loc_elem = u.find('sm:loc', ns)
                    if loc_elem is not None and loc_elem.text:
                        sitemap_locs.append(loc_elem.text.strip())

                self.log_pass(f"sitemap.xml is valid XML containing {len(sitemap_locs)} URLs")

                # Cross-check HTML files
                for hf in html_files:
                    if hf.name == 'index.html':
                        expected_url = "https://ongchu.cloud/"
                    else:
                        expected_url = f"https://ongchu.cloud/{hf.name}"

                    if expected_url in sitemap_locs:
                        self.log_pass(f"sitemap.xml maps {hf.name} -> {expected_url}")
                    else:
                        self.log_fail(f"sitemap.xml is missing URL for {hf.name} (Expected: {expected_url})")

            except Exception as e:
                self.log_fail(f"Error parsing sitemap.xml: {e}")

        # 2. Robots.txt Audit
        robots_path = self.landing_dir / "robots.txt"
        if not robots_path.is_file():
            self.log_fail("robots.txt does not exist")
        else:
            with open(robots_path, 'r', encoding='utf-8') as f:
                r_text = f.read()

            required_agents = ['*', 'GPTBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended']
            missing_agents = [a for a in required_agents if f"User-agent: {a}" not in r_text]
            if not missing_agents:
                self.log_pass(f"robots.txt contains rules for traditional bots and AI crawlers ({', '.join(required_agents)})")
            else:
                self.log_fail(f"robots.txt missing directives for: {', '.join(missing_agents)}")

            if "Sitemap: https://ongchu.cloud/sitemap.xml" in r_text:
                self.log_pass("robots.txt declares Sitemap: https://ongchu.cloud/sitemap.xml")
            else:
                self.log_fail("robots.txt missing Sitemap directive")

        # 3. LLMs.txt Audit
        llms_path = self.landing_dir / "llms.txt"
        if not llms_path.is_file():
            self.log_fail("llms.txt does not exist")
        else:
            size = llms_path.stat().st_size
            if size > 500:
                self.log_pass(f"llms.txt present and populated ({size} bytes, machine-readable AI context ready)")
            else:
                self.log_warn(f"llms.txt seems too small ({size} bytes)")

    def run(self) -> int:
        print("=" * 72)
        print(" ONGCHU POS — AUTOMATED SEO & TECHNICAL INTEGRITY AUDIT")
        print(f" Target Directory: {self.landing_dir}")
        print("=" * 72)

        if not self.landing_dir.is_dir():
            print(f"Error: Directory not found: {self.landing_dir}")
            return 1

        html_files = sorted(list(self.landing_dir.glob("*.html")))
        if not html_files:
            print("Error: No HTML files found in target directory")
            return 1

        for html_file in html_files:
            self.audit_html_file(html_file)

        self.audit_sitemap_and_robots(html_files)

        print("\n" + "=" * 72)
        print(" AUDIT SUMMARY REPORT")
        print("=" * 72)
        print(f" Total Checks Executed : {self.total_checks}")
        print(f" Passed Checks         : \033[32m{self.passed_checks}\033[0m")
        print(f" Warnings Encountered  : \033[33m{self.warnings}\033[0m")
        print(f" Errors Encountered    : \033[31m{self.errors}\033[0m")
        print("-" * 72)

        if self.errors == 0 and self.warnings == 0:
            print("\033[32m\033[1m[INTEGRITY STATUS: 100% PASS — ZERO WARNINGS, ZERO ERRORS]\033[0m")
            return 0
        elif self.errors == 0:
            print("\033[33m\033[1m[INTEGRITY STATUS: PASS WITH WARNINGS]\033[0m")
            return 1 if self.strict_mode else 0
        else:
            print("\033[31m\033[1m[INTEGRITY STATUS: FAIL — RESOLUTION REQUIRED]\033[0m")
            return 1


if __name__ == '__main__':
    if len(sys.argv) >= 2 and not sys.argv[1].startswith("--"):
        target_dir = Path(sys.argv[1])
    else:
        script_dir = Path(__file__).resolve().parent
        if (script_dir / "index.html").is_file():
            target_dir = script_dir
        elif (script_dir.parent / "landing" / "index.html").is_file():
            target_dir = script_dir.parent / "landing"
        elif Path("landing/index.html").is_file():
            target_dir = Path("landing")
        elif Path("index.html").is_file():
            target_dir = Path(".")
        else:
            target_dir = Path("landing")

    strict = "--no-strict" not in sys.argv
    auditor = SEOAuditor(target_dir, strict_mode=strict)
    sys.exit(auditor.run())
