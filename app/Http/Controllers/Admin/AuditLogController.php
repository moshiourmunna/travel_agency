<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use App\Support\AdminUi;
use Inertia\Inertia;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $request->validate(['from' => 'nullable|date', 'to' => 'nullable|date']);
        $q = AuditLog::with('user')->latest('id');
        if ($v = $request->query('action')) $q->where('action', 'like', $v.'%');
        if ($v = $request->query('user_id')) $q->where('user_id', $v);
        if ($v = $request->query('from')) $q->whereDate('created_at', '>=', $v);
        if ($v = $request->query('to')) $q->whereDate('created_at', '<=', $v);

        return Inertia::render('admin/audit/index', [
            'logs' => AdminUi::page($q->paginate(40)->withQueryString(), fn ($l) => ['id' => $l->id, 'at' => $l->created_at?->format('d M Y H:i'), 'user' => $l->user?->name, 'action' => $l->action,
                'subject' => class_basename((string) $l->auditable_type).($l->auditable_id ? ' #'.$l->auditable_id : ''),
                'before' => $l->before ? \Illuminate\Support\Str::limit(json_encode($l->before, JSON_UNESCAPED_UNICODE), 300) : null,
                'after' => $l->after ? \Illuminate\Support\Str::limit(json_encode($l->after, JSON_UNESCAPED_UNICODE), 300) : null, 'ip' => $l->ip]),
            'filters' => AdminUi::filters($request, ['action', 'user_id', 'from', 'to']),
            'users' => User::whereIn('role', ['admin', 'staff'])->orderBy('name')->get()->map(fn ($u) => ['value' => (string) $u->id, 'label' => $u->name])->values(),
            'groups' => AuditLog::distinct()->pluck('action')->map(fn ($a) => explode('.', $a)[0])->unique()->sort()->values()]);
    }
}
