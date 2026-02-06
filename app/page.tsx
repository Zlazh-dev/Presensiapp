import Link from 'next/link';
import { Icons } from '@/app/components/Icons';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-[#0f172a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Icons.QrCode className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">PresensiApp</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 py-16 lg:py-24 max-w-7xl mx-auto gap-12 lg:gap-20">
        <div className="flex-1 text-center lg:text-left space-y-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Sistem Presensi Guru <br />
            <span className="text-purple-400">Digital & Modern</span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
            Solusi presensi digital untuk sekolah yang lebih efisien. Mengurangi rekap manual, hasilkan laporan cepat, dan pantau kehadiran secara real-time.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 justify-center lg:justify-start">
            <Link
              href="/login?role=TEACHER"
              className="w-full sm:w-auto px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-all transform hover:-translate-y-1 shadow-lg shadow-purple-900/50 flex items-center justify-center gap-2"
            >
              <Icons.User className="w-5 h-5" />
              Login Guru
            </Link>
            <Link
              href="/login?role=ADMIN"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all border border-slate-700 hover:border-slate-600 flex items-center justify-center gap-2"
            >
              <Icons.Shield className="w-5 h-5" />
              Login Admin
            </Link>
          </div>
        </div>

        {/* Hero Illustration (Simple Gradient Card) */}
        <div className="flex-1 w-full max-w-md lg:max-w-xl">
          <div className="relative aspect-square">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-3xl opacity-20 blur-3xl animate-pulse"></div>
            <div className="relative bg-slate-800 border border-slate-700 rounded-3xl p-8 shadow-2xl h-full flex flex-col justify-center items-center space-y-6">
              <div className="w-24 h-24 bg-slate-900 rounded-2xl flex items-center justify-center shadow-inner border border-slate-800">
                <Icons.QrCode className="w-12 h-12 text-purple-400" />
              </div>
              <div className="space-y-2 text-center">
                <div className="h-4 w-32 bg-slate-700 rounded-full mx-auto"></div>
                <div className="h-3 w-48 bg-slate-700/50 rounded-full mx-auto"></div>
              </div>
              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="h-8 w-8 bg-emerald-900/30 rounded-lg mb-2"></div>
                  <div className="h-3 w-16 bg-slate-700 rounded-full"></div>
                </div>
                <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
                  <div className="h-8 w-8 bg-amber-900/30 rounded-lg mb-2"></div>
                  <div className="h-3 w-16 bg-slate-700 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="bg-slate-800/50 border-y border-slate-800 py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Fitur Utama</h2>
            <p className="text-slate-400">Semua yang Anda butuhkan untuk manajemen presensi modern</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-slate-900/50 border border-slate-700/50 p-8 rounded-2xl hover:bg-slate-900 transition-colors group">
              <div className="w-14 h-14 bg-purple-900/30 rounded-xl flex items-center justify-center mb-6 border border-purple-500/20 group-hover:border-purple-500/50 transition-colors">
                <Icons.Zap className="w-7 h-7 text-purple-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Presensi QR Cepat</h3>
              <p className="text-slate-400 leading-relaxed">
                Guru cukup scan QR code saat datang dan pulang. Proses instan tanpa antrian panjang.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-900/50 border border-slate-700/50 p-8 rounded-2xl hover:bg-slate-900 transition-colors group">
              <div className="w-14 h-14 bg-blue-900/30 rounded-xl flex items-center justify-center mb-6 border border-blue-500/20 group-hover:border-blue-500/50 transition-colors">
                <Icons.List className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Rekap Otomatis</h3>
              <p className="text-slate-400 leading-relaxed">
                Data kehadiran, keterlambatan, dan ketidakhadiran direkap otomatis oleh sistem secara real-time.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-900/50 border border-slate-700/50 p-8 rounded-2xl hover:bg-slate-900 transition-colors group">
              <div className="w-14 h-14 bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/20 group-hover:border-emerald-500/50 transition-colors">
                <Icons.FileText className="w-7 h-7 text-emerald-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Laporan Siap Cetak</h3>
              <p className="text-slate-400 leading-relaxed">
                Unduh laporan presensi bulanan dalam format yang rapi dan siap untuk kebutuhan administrasi sekolah.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-slate-900 border-t border-slate-800 text-center">
        <p className="text-slate-500 text-sm">
          Dibangun khusus untuk kebutuhan presensi sekolah. &copy; {new Date().getFullYear()} PresensiApp.
        </p>
      </footer>
    </div>
  );
}
