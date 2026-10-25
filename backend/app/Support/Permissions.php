<?php

namespace App\Support;

/**
 * Permission catalogue. The 9 groups mirror the permission matrix of the approved admin mockup
 * (admin/staff): a role that has a group gets every permission in it. Fine-grained names are used by
 * policies, the admin sidebar and API middleware.
 */
final class Permissions
{
    public const GROUPS = [
        'bookings' => ['label' => ['en' => 'Bookings', 'bn' => 'বুকিং'], 'perms' => ['bookings.view', 'bookings.create', 'bookings.update', 'bookings.cancel', 'leads.view', 'leads.manage', 'tickets.view', 'tickets.manage']],
        'payments' => ['label' => ['en' => 'Refunds & payments', 'bn' => 'রিফান্ড ও পেমেন্ট'], 'perms' => ['payments.view', 'payments.record', 'payments.refund', 'payments.reconcile']],
        'catalog' => ['label' => ['en' => 'Catalog (tours, cruises, activities)', 'bn' => 'ক্যাটালগ (ট্যুর, ক্রুজ, অ্যাক্টিভিটি)'], 'perms' => ['catalog.view', 'catalog.manage', 'catalog.publish', 'catalog.delete']],
        'visa' => ['label' => ['en' => 'Visa applications', 'bn' => 'ভিসা আবেদন'], 'perms' => ['visa.view', 'visa.manage', 'visa.documents']],
        'customers' => ['label' => ['en' => 'Customers & PII', 'bn' => 'গ্রাহক ও ব্যক্তিগত তথ্য'], 'perms' => ['customers.view', 'customers.manage', 'customers.export', 'customers.adjust', 'agents.view', 'agents.manage']],
        'content' => ['label' => ['en' => 'Content & media', 'bn' => 'কনটেন্ট ও মিডিয়া'], 'perms' => ['content.view', 'content.manage', 'media.manage', 'reviews.moderate', 'seo.manage', 'menus.manage', 'translations.manage']],
        'coupons' => ['label' => ['en' => 'Coupons & pricing', 'bn' => 'কুপন ও মূল্য'], 'perms' => ['coupons.view', 'coupons.manage', 'offers.manage']],
        'reports' => ['label' => ['en' => 'Reports', 'bn' => 'রিপোর্ট'], 'perms' => ['reports.view', 'reports.export', 'dashboard.finance']],
        'settings' => ['label' => ['en' => 'Staff & settings', 'bn' => 'স্টাফ ও সেটিংস'], 'perms' => ['staff.manage', 'roles.manage', 'settings.manage', 'settings.payments', 'notifications.manage', 'logs.view']],
    ];

    /** Mockup roles (admin/staff) => groups they hold. */
    public const ROLES = [
        'owner' => ['label' => ['en' => 'Owner', 'bn' => 'মালিক'], 'groups' => ['bookings', 'payments', 'catalog', 'visa', 'customers', 'content', 'coupons', 'reports', 'settings']],
        'manager' => ['label' => ['en' => 'Manager', 'bn' => 'ম্যানেজার'], 'groups' => ['bookings', 'payments', 'catalog', 'visa', 'customers', 'coupons', 'reports']],
        'agent' => ['label' => ['en' => 'Reservations', 'bn' => 'রিজারভেশন'], 'groups' => ['bookings', 'customers']],
        'visa' => ['label' => ['en' => 'Visa officer', 'bn' => 'ভিসা অফিসার'], 'groups' => ['visa']],
        'support' => ['label' => ['en' => 'Support', 'bn' => 'সাপোর্ট'], 'groups' => ['bookings', 'customers']],
        'finance' => ['label' => ['en' => 'Finance', 'bn' => 'ফাইন্যান্স'], 'groups' => ['bookings', 'payments', 'reports']],
        'editor' => ['label' => ['en' => 'Editor', 'bn' => 'এডিটর'], 'groups' => ['catalog', 'content']],
    ];

    /** @return list<string> */
    public static function all(): array
    {
        return array_values(array_unique(array_merge(['admin.access'], ...array_map(fn ($g) => $g['perms'], array_values(self::GROUPS)))));
    }

    /** @return list<string> */
    public static function forGroups(array $groups): array
    {
        $perms = ['admin.access'];
        foreach ($groups as $g) {
            $perms = array_merge($perms, self::GROUPS[$g]['perms'] ?? []);
        }

        return array_values(array_unique($perms));
    }
}
