import { Head } from '@inertiajs/react';

export default function Health({ app, db }: { app: string; db: string }) {
    return (
        <main className="wrap py-16">
            <Head title="Health" />
            <h1 className="text-3xl">Musafir admin is running</h1>
            <p className="mt-2 muted">{app} · database: {db}</p>
        </main>
    );
}
