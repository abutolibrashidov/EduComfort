import React, { useRef } from 'react';
import { Modal, Button } from 'antd';
import { PrinterOutlined, DownloadOutlined } from '@ant-design/icons';

/**
 * Premium EduComfort Certificate Modal
 * Props: open, onClose, cert, studentName
 * cert fields: rank, total_points, group_name, teacher_name, end_date
 */

const GOLD = '#C9A44E';
const GOLD_LIGHT = '#F0D080';
const NAVY = '#0B1E3D';
const NAVY_MID = '#0F2A52';
const BLUE = '#1A73E8';

const medal = (rank) => {
    if (rank === 1) return { from: '#FFD700', to: '#FFA500', ring: '#FFD700', textColor: '#7A4F00' };
    if (rank === 2) return { from: '#D8D8D8', to: '#A8A8A8', ring: '#C8C8C8', textColor: '#383838' };
    if (rank === 3) return { from: '#CD7F32', to: '#A05A2C', ring: '#CD7F32', textColor: '#fff' };
    return { from: '#7090B0', to: '#4A6080', ring: '#7090B0', textColor: '#fff' };
};

const Corner = ({ rotate }) => (
    <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: `rotate(${rotate}deg)` }}>
        <path d="M2 2 L2 18 L5 18 L5 5 L18 5 L18 2 Z" fill={GOLD} />
        <path d="M8 8 L8 12 L12 12 L12 8 Z" fill="none" stroke={GOLD} strokeWidth="1" opacity="0.5" />
    </svg>
);

const CertificateModal = ({ open, onClose, cert, studentName }) => {
    const certRef = useRef(null);

    if (!cert || !open) return null;

    const m = medal(cert.rank);
    const rankLabel = `${cert.rank}-O'RIN`;
    const dateStr = cert.end_date
        ? new Date(cert.end_date).toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : new Date().toLocaleDateString('uz-UZ', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const starCount = Math.max(1, Math.min(5, 6 - cert.rank));

    const openPrint = () => {
        const el = certRef.current;
        if (!el) return;
        const w = window.open('', '_blank');
        w.document.write(`<html><head><title>EduComfort Sertifikat</title>
      <style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#fff;display:flex;justify-content:center}
      @media print{@page{size:1000px 620px;margin:0}body{padding:0}}</style>
      </head><body>${el.outerHTML}</body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 600);
    };

    return (
        <Modal
            open={open}
            onCancel={onClose}
            footer={null}
            width={800}
            centered
            styles={{
                content: { padding: 0, background: 'transparent', boxShadow: 'none' },
                mask: { backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' },
            }}
        >
            {/* Buttons above certificate */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                <Button icon={<PrinterOutlined />} onClick={openPrint} style={{ borderRadius: 8, height: 38 }}>
                    Chop etish
                </Button>
                <Button
                    type="primary" icon={<DownloadOutlined />} onClick={openPrint}
                    style={{ background: GOLD, borderColor: GOLD, borderRadius: 8, height: 38, fontWeight: 600 }}>
                    Yuklab olish (PDF)
                </Button>
            </div>

            {/* ──── CERTIFICATE ──── */}
            <div
                ref={certRef}
                style={{
                    background: `linear-gradient(150deg, ${NAVY} 0%, ${NAVY_MID} 55%, ${NAVY} 100%)`,
                    borderRadius: 12,
                    padding: 4,
                    // Gold border via nested div trick
                }}
            >
                {/* Gold outer ring */}
                <div style={{
                    background: `linear-gradient(135deg, ${GOLD}, ${GOLD_LIGHT} 40%, ${GOLD} 60%, ${GOLD_LIGHT})`,
                    borderRadius: 11,
                    padding: 3,
                }}>
                    {/* Main navy body */}
                    <div style={{
                        background: `linear-gradient(150deg, ${NAVY} 0%, ${NAVY_MID} 55%, ${NAVY} 100%)`,
                        borderRadius: 9,
                        padding: '36px 44px',
                        position: 'relative',
                    }}>

                        {/* Inner thin gold frame */}
                        <div style={{
                            position: 'absolute', inset: 18,
                            border: `1px solid rgba(201,164,78,0.25)`,
                            borderRadius: 6, pointerEvents: 'none',
                        }} />

                        {/* Corner ornaments */}
                        <div style={{ position: 'absolute', top: 12, left: 12 }}><Corner rotate={0} /></div>
                        <div style={{ position: 'absolute', top: 12, right: 12 }}><Corner rotate={90} /></div>
                        <div style={{ position: 'absolute', bottom: 12, left: 12 }}><Corner rotate={270} /></div>
                        <div style={{ position: 'absolute', bottom: 12, right: 12 }}><Corner rotate={180} /></div>

                        {/* ── HEADER ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
                            {/* EduComfort brand mark */}
                            <div style={{ textAlign: 'center', lineHeight: 1.15 }}>
                                <span style={{ fontSize: 13, fontWeight: 900, color: BLUE, letterSpacing: 2, fontFamily: 'sans-serif' }}>EDU</span>
                                <span style={{ fontSize: 13, fontWeight: 400, color: GOLD_LIGHT, letterSpacing: 1, fontFamily: 'sans-serif', marginLeft: 3 }}>Comfort</span>
                            </div>
                            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
                        </div>

                        {/* ── TITLE (single line, no wrapping) ── */}
                        <div style={{ textAlign: 'center', marginBottom: 6 }}>
                            <div style={{
                                fontSize: 12,
                                fontWeight: 700,
                                letterSpacing: 7,
                                color: GOLD,
                                fontFamily: "'Georgia', serif",
                                textTransform: 'uppercase',
                                whiteSpace: 'nowrap',        /* ← prevents wrapping */
                            }}>
                                MUVAFFAQIYAT SERTIFIKATI
                            </div>
                        </div>

                        {/* Diamond divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 18 }}>
                            <div style={{ height: 1, width: 60, background: `linear-gradient(to right, transparent, ${GOLD})` }} />
                            <div style={{ width: 5, height: 5, background: GOLD, transform: 'rotate(45deg)' }} />
                            <div style={{ height: 1, width: 60, background: `linear-gradient(to left, transparent, ${GOLD})` }} />
                        </div>

                        {/* ── CONGRATS ── */}
                        <div style={{ textAlign: 'center', marginBottom: 6 }}>
                            <div style={{ fontSize: 15, color: GOLD_LIGHT, fontWeight: 700, fontFamily: "'Georgia', serif" }}>
                                EduComfort sizni tabriklaidi!
                            </div>
                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', marginTop: 4, fontFamily: "'Georgia', serif" }}>
                                Ushbu sertifikat
                            </div>
                        </div>

                        {/* ── STUDENT NAME ── */}
                        <div style={{ textAlign: 'center', marginBottom: 18 }}>
                            <div style={{
                                fontSize: 34,
                                fontWeight: 900,
                                color: GOLD_LIGHT,
                                fontFamily: "'Georgia', 'Times New Roman', serif",
                                fontStyle: 'italic',
                                textShadow: `0 0 24px rgba(240,208,128,0.35)`,
                                lineHeight: 1.15,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}>
                                {studentName || "O'quvchi"}
                            </div>
                        </div>

                        {/* ── BODY: medal + achievement text ── */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginBottom: 20 }}>

                            {/* Medal */}
                            <div style={{ flexShrink: 0, textAlign: 'center' }}>
                                <div style={{
                                    width: 80, height: 80,
                                    borderRadius: '50%',
                                    background: `linear-gradient(145deg, ${m.from}, ${m.to})`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: `0 0 0 3px ${NAVY_MID}, 0 0 0 6px ${m.ring}, 0 6px 20px rgba(0,0,0,0.4)`,
                                    fontSize: 26, fontWeight: 900, color: m.textColor,
                                    position: 'relative',
                                }}>
                                    {cert.rank}
                                    {/* Ribbon */}
                                    <div style={{
                                        position: 'absolute', bottom: -16,
                                        left: '50%', transform: 'translateX(-50%)',
                                        width: 32, height: 14,
                                        background: `linear-gradient(180deg, ${m.from}, ${m.to})`,
                                        clipPath: 'polygon(0 0, 100% 0, 85% 100%, 15% 100%)',
                                    }} />
                                </div>
                                <div style={{ marginTop: 22, fontSize: 10, color: GOLD, fontWeight: 800, letterSpacing: 2 }}>
                                    {rankLabel}
                                </div>
                            </div>

                            {/* Achievement info */}
                            <div style={{ flex: 1, textAlign: 'center' }}>
                                {cert.group_name && (
                                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', fontFamily: "'Georgia', serif", marginBottom: 2 }}>
                                        {cert.group_name} guruhida
                                    </div>
                                )}
                                <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: "'Georgia', serif", marginBottom: 10 }}>
                                    {cert.rank}-o'rinni egalladi
                                </div>
                                {/* Points */}
                                <div style={{
                                    display: 'inline-block',
                                    border: `1px solid ${GOLD}`,
                                    color: GOLD_LIGHT,
                                    padding: '3px 18px',
                                    borderRadius: 20,
                                    fontSize: 14,
                                    fontWeight: 600,
                                    marginBottom: 10,
                                }}>
                                    {cert.total_points} ball
                                </div>
                                {/* Stars */}
                                <div style={{ fontSize: 20, letterSpacing: 4, color: GOLD }}>
                                    {'★'.repeat(starCount)}{'☆'.repeat(5 - starCount)}
                                </div>
                            </div>
                        </div>

                        {/* Bottom divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                            <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, rgba(201,164,78,0.4))` }} />
                            <div style={{ width: 4, height: 4, background: GOLD, transform: 'rotate(45deg)', opacity: 0.5 }} />
                            <div style={{ flex: 1, height: 1, background: `linear-gradient(to left, transparent, rgba(201,164,78,0.4))` }} />
                        </div>

                        {/* ── FOOTER META ── */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            {/* Teacher */}
                            <div style={{ textAlign: 'center', minWidth: 120 }}>
                                <div style={{ height: 1, background: 'rgba(201,164,78,0.4)', marginBottom: 6 }} />
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>
                                    {cert.teacher_name ? cert.teacher_name : "O'qituvchi"}
                                </div>
                            </div>

                            {/* Center branding */}
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: 10, color: `rgba(201,164,78,0.5)`, letterSpacing: 1, fontFamily: 'sans-serif' }}>
                                    EduComfort
                                </div>
                            </div>

                            {/* Date */}
                            <div style={{ textAlign: 'center', minWidth: 120 }}>
                                <div style={{ height: 1, background: 'rgba(201,164,78,0.4)', marginBottom: 6 }} />
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', letterSpacing: 0.5 }}>
                                    {dateStr}
                                </div>
                            </div>
                        </div>

                        {/* ── FOOTER LINE ── */}
                        <div style={{ height: 1, background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`, margin: '12px 0 8px' }} />
                        <div style={{ textAlign: 'center', fontSize: 10, color: `rgba(201,164,78,0.5)`, letterSpacing: 2 }}>
                            EduComfort — Ta'lim sifatini baholash tizimi
                        </div>

                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default CertificateModal;
