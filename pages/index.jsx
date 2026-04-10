import dynamic from 'next/dynamic';

const GameProvider = dynamic(
    () => import('../src/context/GameProvider').then(mod => mod.GameProvider),
    { ssr: false }
);

export default function HomePage() {
    return <GameProvider />;
}
