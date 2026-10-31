<?php

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMXPath;

/**
 * Makes an uploaded SVG safe to serve from our own origin: removes scripts, event handlers, external/javascript
 * references, <foreignObject>, <iframe>/<embed>/<object> and DOCTYPE/entities (XXE). Returns null if it is not a valid SVG.
 */
final class SvgSanitizer
{
    private const BAD_TAGS = ['script', 'foreignobject', 'iframe', 'embed', 'object', 'audio', 'video', 'handler', 'listener', 'set', 'animate'];

    public static function clean(string $svg): ?string
    {
        if (preg_match('/<!DOCTYPE|<!ENTITY/i', $svg)) {
            $svg = preg_replace('/<!DOCTYPE[^>\[]*(\[[^\]]*\])?>/is', '', $svg);
        }
        $doc = new DOMDocument;
        $prev = libxml_use_internal_errors(true);
        $ok = $doc->loadXML($svg, LIBXML_NONET | LIBXML_NOBLANKS);
        libxml_use_internal_errors($prev);
        if (! $ok || strtolower($doc->documentElement?->localName ?? '') !== 'svg') {
            return null;
        }
        $x = new DOMXPath($doc);
        foreach (iterator_to_array($x->query('//*')) as $el) {
            /** @var DOMElement $el */
            if (in_array(strtolower($el->localName), self::BAD_TAGS, true)) {
                $el->parentNode?->removeChild($el);

                continue;
            }
            foreach (iterator_to_array($el->attributes) as $attr) {
                $name = strtolower($attr->nodeName);
                $val = strtolower(preg_replace('/\s+/', '', $attr->nodeValue));
                if (str_starts_with($name, 'on')
                    || (in_array($name, ['href', 'xlink:href', 'src'], true) && ! str_starts_with($val, '#') && ! str_starts_with($val, 'data:image/'))
                    || str_contains($val, 'javascript:') || str_contains($val, 'vbscript:')
                    || ($name === 'style' && (str_contains($val, 'expression(') || str_contains($val, 'url(') && ! str_contains($val, 'url(#')))) {
                    $el->removeAttributeNode($attr);
                }
            }
        }
        foreach (iterator_to_array($x->query('//processing-instruction()')) as $pi) {
            $pi->parentNode?->removeChild($pi);
        }

        return $doc->saveXML($doc->documentElement);
    }
}
