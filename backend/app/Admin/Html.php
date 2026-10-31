<?php

namespace App\Admin;

use DOMDocument;
use DOMElement;
use DOMNode;

/** Allow-list sanitiser for rich text saved from the admin editor (no scripts, styles, event handlers or javascript: links). */
final class Html
{
    private const TAGS = ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'a', 'blockquote', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'figure', 'figcaption', 'img', 'code', 'pre', 'sub', 'sup'];

    private const ATTRS = ['a' => ['href', 'title', 'target', 'rel'], 'img' => ['src', 'alt', 'width', 'height', 'loading'], 'td' => ['colspan', 'rowspan'], 'th' => ['colspan', 'rowspan', 'scope'], '*' => ['id', 'class']];

    public static function clean(string $html): string
    {
        $html = trim($html);
        if ($html === '' || ! str_contains($html, '<')) {
            return $html;
        }
        $doc = new DOMDocument('1.0', 'UTF-8');
        libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"><div id="__root">'.$html.'</div>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        $root = $doc->getElementById('__root') ?? $doc->documentElement;
        self::walk($root);
        $out = '';
        foreach (iterator_to_array($root->childNodes) as $child) {
            $out .= $doc->saveHTML($child);
        }

        return trim($out);
    }

    private static function walk(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                $tag = strtolower($child->tagName);
                if (in_array($tag, ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'textarea', 'select', 'link', 'meta'], true)) {
                    $node->removeChild($child);

                    continue;
                }
                if (! in_array($tag, self::TAGS, true)) {
                    self::walk($child);
                    while ($child->firstChild) {
                        $node->insertBefore($child->firstChild, $child);
                    }
                    $node->removeChild($child);

                    continue;
                }
                $allowed = array_merge(self::ATTRS[$tag] ?? [], self::ATTRS['*']);
                foreach (iterator_to_array($child->attributes) as $attr) {
                    $name = strtolower($attr->name);
                    $val = trim($attr->value);
                    if (! in_array($name, $allowed, true) || (in_array($name, ['href', 'src'], true) && preg_match('/^\s*(javascript|vbscript|data):/i', $val) && ! preg_match('/^data:image\//i', $val))) {
                        $child->removeAttribute($attr->name);
                    }
                }
                if ($tag === 'a' && $child->getAttribute('target') === '_blank') {
                    $child->setAttribute('rel', 'noopener noreferrer');
                }
                self::walk($child);
            } elseif ($child->nodeType === XML_COMMENT_NODE) {
                $node->removeChild($child);
            }
        }
    }
}
