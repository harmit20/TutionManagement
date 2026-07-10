import { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import jsQR from 'jsqr';
import api from '../../services/api';
import Modal from './Modal';

/**
 * Student QR check-in: scans the teacher's on-screen QR with the phone
 * camera, with a manual code field as fallback (no camera / permissions).
 */
export default function QrCheckIn() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  const checkInMutation = useMutation({
    mutationFn: (token) => api.post('/student/attendance/check-in', { token }).then((r) => r.data),
    onSuccess: (d) => {
      toast.success(d.message);
      qc.invalidateQueries({ queryKey: ['student-attendance'] });
      close();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Check-in failed'),
  });

  const close = () => {
    setOpen(false);
    setManualCode('');
    setCameraError(null);
  };

  // Camera lifecycle bound to modal visibility
  useEffect(() => {
    if (!open) {
      cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      return;
    }

    let cancelled = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const scan = () => {
      const video = videoRef.current;
      if (cancelled || !video) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(img.data, img.width, img.height);
        if (code?.data && !checkInMutation.isPending) {
          checkInMutation.mutate(code.data);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(scan);
    };

    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(scan);
      })
      .catch(() => setCameraError('Camera unavailable — type the code from your teacher\'s screen instead.'));

    return () => { cancelled = true; };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>🔳 Scan QR to Check In</button>

      <Modal open={open} onClose={close} title="Check In"
        footer={<>
          <button className="btn-secondary" onClick={close}>Cancel</button>
          <button className="btn-primary" disabled={!manualCode.trim() || checkInMutation.isPending}
            onClick={() => checkInMutation.mutate(manualCode)}>
            {checkInMutation.isPending ? 'Checking in…' : 'Check In with Code'}
          </button>
        </>}>
        <div className="space-y-3">
          {!cameraError ? (
            <video ref={videoRef} muted playsInline className="w-full rounded-lg bg-gray-900 aspect-video object-cover" />
          ) : (
            <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{cameraError}</p>
          )}
          <div>
            <label className="label">Or enter the code manually</label>
            <input className="input font-mono" placeholder="Paste the code shown under the QR"
              value={manualCode} onChange={(e) => setManualCode(e.target.value)} />
          </div>
        </div>
      </Modal>
    </>
  );
}
