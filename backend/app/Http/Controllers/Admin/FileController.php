<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\JobApplication;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Private files (visa documents, CVs): streamed after a permission check; never on a public disk. */
class FileController extends Controller
{
    public function document(Request $r, Document $document): StreamedResponse
    {
        abort_unless($r->user()->can('visa.documents') || $r->user()->can('visa.view'), 403);
        $disk = $document->disk ?: 'local';
        abort_unless($document->path && Storage::disk($disk)->exists($document->path), 404);
        activity('admin')->causedBy($r->user())->performedOn($document)->event('viewed')->withProperties(['resource' => 'documents', 'title' => $document->label])->log('viewed');

        return Storage::disk($disk)->response($document->path, basename($document->path), ['Cache-Control' => 'no-store, private', 'X-Content-Type-Options' => 'nosniff', 'Content-Security-Policy' => "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'"]);
    }

    public function cv(Request $r, JobApplication $application): StreamedResponse
    {
        abort_unless($r->user()->can('staff.manage'), 403);
        abort_unless($application->cv_path && Storage::disk('local')->exists($application->cv_path), 404);

        return Storage::disk('local')->download($application->cv_path, 'CV-'.\Illuminate\Support\Str::slug($application->name).'.'.pathinfo($application->cv_path, PATHINFO_EXTENSION), ['Cache-Control' => 'no-store, private']);
    }
}
