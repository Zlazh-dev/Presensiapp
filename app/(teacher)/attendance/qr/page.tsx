'use client';

import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Icons } from '@/app/components/Icons';

export default function TeacherQrScannerPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [cameraPermission, setCameraPermission] = useState<PermissionState | 'prompt'>('prompt');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Start scanner
    const startScanner = async () => {
        try {
            setError(null);

            // Check if browser supports camera access
            const canUseCamera =
                typeof navigator !== 'undefined' &&
                typeof navigator.mediaDevices !== 'undefined' &&
                typeof navigator.mediaDevices.getUserMedia === 'function';

            if (!canUseCamera) {
                setError('Browser ini tidak mendukung akses kamera. Coba pakai Chrome/Edge terbaru atau gunakan localhost/HTTPS.');
                return;
            }

            // Check secure context (HTTPS or localhost)
            const isSecureContext =
                typeof window !== 'undefined' &&
                (window.isSecureContext || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

            if (!isSecureContext) {
                setError('Akses kamera hanya didukung di HTTPS atau localhost. Saat ini Anda mengakses via HTTP non-localhost.');
                return;
            }

            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Important: play() must be called to start video stream
                videoRef.current.setAttribute('playsinline', 'true'); // required to tell iOS safari we don't want fullscreen
                videoRef.current.play();
                setIsScanning(true);
                requestAnimationFrame(tick);
            }
        } catch (err: any) {
            console.error('Error accessing camera:', err);

            // User-friendly error messages
            let errorMessage = 'Gagal mengakses kamera.';

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage = 'Izin kamera ditolak. Silakan beri izin kamera di pengaturan browser Anda.';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage = 'Tidak ada kamera yang terdeteksi di perangkat ini.';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage = 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut dan coba lagi.';
            } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                errorMessage = 'Kamera tidak mendukung konfigurasi yang diminta.';
            } else if (err.name === 'TypeError') {
                errorMessage = 'Terjadi kesalahan konfigurasi. Coba refresh halaman.';
            }

            setError(errorMessage);
            setCameraPermission('denied');
        }
    };

    // Stop scanner
    const stopScanner = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsScanning(false);
    };

    // Submit attendance
    const submitAttendance = async (token: string) => {
        setIsSubmitting(true);
        stopScanner();

        try {
            const response = await fetch('/api/v1/attendance/qr/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: Auth usually handled by session cookie, but prompt mentioned using helper if needed
                    // here we assume browser sends cookies automatically
                    // 'x-user-id': '2' // Uncomment for manual testing if needed
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Gagal memproses presensi');
            }

            setScanResult({
                status: 'success',
                ...data
            });
        } catch (err: any) {
            setScanResult({
                status: 'error',
                message: err.message || 'Terjadi kesalahan sistem'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const tick = () => {
        if (!videoRef.current || !canvasRef.current || !isScanning) return;

        if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;

            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;

            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

                // Decode QR
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                    inversionAttempts: 'dontInvert',
                });

                if (code && code.data) {
                    // Found QR Code!
                    submitAttendance(code.data);
                    return; // Stop loop
                }
            }
        }

        if (isScanning) {
            requestAnimationFrame(tick);
        }
    };

    useEffect(() => {
        // Cleanup on unmount
        return () => {
            stopScanner();
        };
    }, []);

    const resetScan = () => {
        setScanResult(null);
        startScanner();
    };

    // Render Logic

    // 1. Result View
    if (scanResult) {
        if (scanResult.status === 'success') {
            const isLate = scanResult.attendance.status === 'LATE';
            return (
                <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 animate-bounce">
                        <Icons.Check className="w-10 h-10 text-emerald-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Presensi Berhasil!</h1>
                    <p className="text-slate-500 mb-8">Data kehadiran Anda telah tercatat.</p>

                    <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm space-y-4 border border-slate-100">
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-400 text-sm font-medium">Jenis</span>
                            <span className="font-bold text-slate-800 uppercase tracking-wide bg-slate-100 px-2 py-1 rounded text-xs">
                                {scanResult.type === 'CHECK_IN' ? 'Masuk' : 'Pulang'}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-slate-50">
                            <span className="text-slate-400 text-sm font-medium">Jam</span>
                            <span className="font-mono font-bold text-xl text-slate-800">
                                {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                            <span className="text-slate-400 text-sm font-medium">Status</span>
                            {isLate ? (
                                <span className="font-bold text-amber-600">
                                    Terlambat {scanResult.attendance.lateMinutes}m
                                </span>
                            ) : (
                                <span className="font-bold text-emerald-600">
                                    Tepat Waktu
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={resetScan}
                        className="mt-8 px-6 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-colors"
                    >
                        Scan Lagi
                    </button>
                </div>
            );
        }

        // Error Result
        return (
            <div className="min-h-screen bg-slate-50 p-6 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mb-6">
                    <Icons.X className="w-10 h-10 text-rose-600" />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 mb-2">Gagal Scan</h1>
                <p className="text-rose-600 font-medium mb-8 max-w-xs">{scanResult.message}</p>

                <button
                    onClick={resetScan}
                    className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-200 transition-all"
                >
                    Coba Lagi
                </button>
            </div>
        );
    }

    // 2. Scanner View
    return (
        <div className="min-h-screen bg-black flex flex-col">
            <div className="flex-1 relative overflow-hidden">
                {/* Video Stream */}
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full object-cover ${!isScanning ? 'pointer-events-none opacity-0' : ''}`}
                    muted
                    playsInline
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Permission Screen */}
                {!isScanning && !error && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center space-y-4 z-10">
                        <Icons.Camera className="w-16 h-16 opacity-50" />
                        <p className="text-white/70">Izin kamera diperlukan untuk melakukan scan.</p>
                        <button
                            type="button"
                            onClick={startScanner}
                            className="px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-slate-200 transition-colors shadow-lg"
                        >
                            Aktifkan Kamera
                        </button>
                    </div>
                )}

                {/* Overlay UI */}
                {isScanning && (
                    <>
                        <div className="absolute inset-0 bg-black/50 pointer-events-none z-20">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-4 border-white/80 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                <div className="absolute inset-0 w-full h-full animate-[pulse_2s_ease-in-out_infinite] border-4 border-purple-500/50 rounded-2xl" />
                            </div>
                        </div>
                        <div className="absolute bottom-12 left-0 right-0 text-center space-y-2 pointer-events-none z-20">
                            <p className="text-white font-bold text-lg drop-shadow-md">Arahkan kamera ke QR Code</p>
                            <p className="text-white/70 text-sm">Pastikan QR berada di dalam kotak</p>
                        </div>
                    </>
                )}
            </div>

            {/* Error Overlay */}
            {error && (
                <div className="absolute inset-0 bg-slate-900 p-8 flex flex-col items-center justify-center text-center space-y-4 z-30">
                    <Icons.AlertCircle className="w-16 h-16 text-rose-500" />
                    <h3 className="text-xl font-bold text-white">Oops!</h3>
                    <p className="text-slate-300">{error}</p>
                    <button
                        type="button"
                        onClick={startScanner}
                        className="px-6 py-3 bg-rose-600 text-white font-bold rounded-xl"
                    >
                        Coba Lagi
                    </button>
                </div>
            )}

            {/* Submitting Overlay */}
            {isSubmitting && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 text-white space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-purple-500"></div>
                    <p className="font-bold text-lg">Memverifikasi...</p>
                </div>
            )}
        </div>
    );
}
