import Scene3DWrapper from './components/Scene3DWrapper';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="bg-blue-600 text-white p-4 shadow-md">
        <h1 className="text-2xl font-bold">PrintBox</h1>
        <p className="text-sm">3D Printing Assistant</p>
      </header>
      
      <main className="flex-grow">
        <Scene3DWrapper />
      </main>
      
      <footer className="bg-gray-100 p-4 text-center text-gray-600 text-sm">
        <p>PrintBox - A 3D Printing Web Application</p>
      </footer>
    </div>
  );
}
