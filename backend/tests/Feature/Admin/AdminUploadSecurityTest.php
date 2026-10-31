<?php

use App\Support\SvgSanitizer;
use Illuminate\Http\UploadedFile;

it('strips scripts, handlers and external references from SVGs', function () {
    $dirty = '<?xml version="1.0"?><!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" onload="alert(1)">'
        .'<script>alert(2)</script><a xlink:href="javascript:alert(3)"><rect width="10" height="10" onclick="x()" fill="url(#g)"/></a>'
        .'<foreignObject><iframe src="https://evil"/></foreignObject><use href="#ok"/><image href="https://evil/x.png"/></svg>';
    $clean = SvgSanitizer::clean($dirty);
    expect($clean)->not->toContain('script')->not->toContain('onload')->not->toContain('onclick')->not->toContain('javascript')
        ->not->toContain('foreignObject')->not->toContain('evil')->not->toContain('ENTITY')
        ->toContain('<rect')->toContain('url(#g)')->toContain('href="#ok"');
    expect(SvgSanitizer::clean('<html><script>1</script></html>'))->toBeNull();
});

it('sanitises SVG uploads and rejects fake images in the media library', function () {
    $svg = UploadedFile::fake()->createWithContent('logo.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><circle r="4"/></svg>');
    asStaff('content')->post(adminUrl('media'), ['files' => [$svg]])->assertSessionHasNoErrors();
    $a = App\Models\MediaAsset::latest('id')->first();
    $stored = file_get_contents($a->getFirstMedia('file')->getPath());
    expect($stored)->toContain('<circle')->not->toContain('script')->not->toContain('onload');

    $fake = UploadedFile::fake()->createWithContent('photo.jpg', '<?php echo 1; ?>');
    asStaff('content')->post(adminUrl('media'), ['files' => [$fake]])->assertSessionHasErrors('files.0');
    $html = UploadedFile::fake()->createWithContent('page.svg', '<html><body onload="x()">hi</body></html>');
    asStaff('content')->post(adminUrl('media'), ['files' => [$html]])->assertSessionHasErrors('files.0');
});
