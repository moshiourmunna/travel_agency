<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

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

        return view('admin.audit.index', ['logs' => $q->paginate(40)->withQueryString(), 'users' => User::whereIn('role', ['admin', 'staff'])->orderBy('name')->get(),
            'groups' => AuditLog::distinct()->pluck('action')->map(fn ($a) => explode('.', $a)[0])->unique()->sort()->values()]);
    }
}
