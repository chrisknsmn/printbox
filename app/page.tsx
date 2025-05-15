import Scene3DWrapper from './components/Scene3DWrapper';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col h-screen w-screen">
      <header className="p-4 shadow-md flex gap-4 items-center">
        <Image src="/logo.svg" alt="Logo" width={50} height={50} className="h-[30px] w-auto" />
      </header>
      <main className="flex-1 overflow-hidden">
        <Scene3DWrapper />
      </main>
      <footer className="p-2 text-center text-sm">
      <p>PrintBox {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}