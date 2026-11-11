import { CommonModule, DOCUMENT } from '@angular/common';
import { AfterViewInit, Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ContractSigningService, SigningInvitation } from '../../services/contract-signing.service';

@Component({
  selector: 'app-contract-signing',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contract-signing.component.html',
})
export class ContractSigningComponent implements AfterViewInit, OnDestroy {
  private readonly api = inject(ContractSigningService);
  private readonly route = inject(ActivatedRoute);
  private readonly documentRef = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);
  @ViewChild('signatureCanvas') canvas?: ElementRef<HTMLCanvasElement>;

  readonly invitation = signal<SigningInvitation | null>(null);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly info = signal('');
  readonly verified = signal(false);
  readonly finished = signal(false);
  readonly pdfUrl = signal<string | null>(null);
  readonly pdfSafeUrl = signal<SafeResourceUrl | null>(null);
  readonly hasInk = signal(false);
  readonly consentText = 'Declaro que he revisado el documento contractual mostrado, que deseo firmarlo electrónicamente y que acepto utilizar mi firma dibujada como manifestación de consentimiento.';
  token = '';
  otp = '';
  signerName = '';
  consent = false;
  private drawing = false;
  private context: CanvasRenderingContext2D | null = null;
  private lastX = 0;
  private lastY = 0;

  

  constructor() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!this.token) { this.loading.set(false); this.error.set('Enlace de firma inválido.'); return; }
    this.refresh();
  }

  ngAfterViewInit(): void { this.setupCanvas(); }
  ngOnDestroy(): void {
    const url = this.pdfUrl();
    if (url) URL.revokeObjectURL(url);
  }
  private setError(err: unknown, fallback: string): void {
    const http = err as HttpErrorResponse;
    this.error.set(http?.error?.message || fallback);
    this.busy.set(false);
  }
  refresh(): void {
    this.loading.set(true);
    this.error.set('');
    this.api.invitation(this.token).subscribe({
      next: data => {
        this.invitation.set(data);
        this.signerName = data.signer_name;
        this.verified.set(data.status === 'verified');
        this.finished.set(data.status === 'signed');
        this.loading.set(false);
        if (data.status === 'pending' || data.status === 'verified') this.loadDocument();
        setTimeout(() => this.setupCanvas(), 0);
      },
      error: err => { this.loading.set(false); this.setError(err, 'No fue posible consultar la invitación.'); },
    });
  }
  private loadDocument(): void {
    this.api.document(this.token).subscribe({
      next: blob => {
        const old = this.pdfUrl();
        if (old) URL.revokeObjectURL(old);
        const objectUrl = URL.createObjectURL(blob);
        this.pdfUrl.set(objectUrl);
        this.pdfSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl));
      },
      error: err => this.setError(err, 'No se pudo cargar el PDF. No firmes sin revisar el documento.'),
    });
  }
  requestOtp(): void {
    this.busy.set(true); this.error.set(''); this.info.set('');
    this.api.requestOtp(this.token).subscribe({
      next: () => { this.busy.set(false); this.info.set('Código enviado al correo registrado.'); },
      error: err => this.setError(err, 'No se pudo enviar el código.'),
    });
  }
  verifyOtp(): void {
    if (!/^\d{6}$/.test(this.otp)) { this.error.set('Introduce los seis dígitos del código.'); return; }
    this.busy.set(true); this.error.set('');
    this.api.verifyOtp(this.token, this.otp).subscribe({
      next: result => {
        this.busy.set(false);
        if (result.verified) { this.otp = ''; this.verified.set(true); this.info.set('Correo verificado correctamente.'); setTimeout(() => this.setupCanvas(), 0); }
      },
      error: err => this.setError(err, 'No se pudo verificar el código.'),
    });
  }
  private setupCanvas(): void {
    const canvas = this.canvas?.nativeElement;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.context = context;
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#17243b';
  }
  private position(event: PointerEvent): { x: number; y: number } {
    const rect = this.canvas!.nativeElement.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * this.canvas!.nativeElement.width / rect.width,
      y: (event.clientY - rect.top) * this.canvas!.nativeElement.height / rect.height,
    };
  }
  pointerDown(event: PointerEvent): void {
    if (!this.verified() || this.busy()) return;
    this.setupCanvas();
    const canvas = this.canvas?.nativeElement;
    if (!canvas || !this.context) return;
    canvas.setPointerCapture(event.pointerId);
    const pos = this.position(event);
    this.lastX = pos.x; this.lastY = pos.y;
    this.drawing = true;
    this.context.beginPath();
    this.context.moveTo(pos.x, pos.y);
  }
  pointerMove(event: PointerEvent): void {
    if (!this.drawing || !this.context) return;
    const pos = this.position(event);
    this.context.beginPath();
    this.context.moveTo(this.lastX, this.lastY);
    this.context.lineTo(pos.x, pos.y);
    this.context.stroke();
    this.lastX = pos.x; this.lastY = pos.y;
    this.hasInk.set(true);
  }
  pointerUp(): void { this.drawing = false; }
  clearSignature(): void {
    const canvas = this.canvas?.nativeElement;
    if (canvas) this.context?.clearRect(0, 0, canvas.width, canvas.height);
    this.hasInk.set(false);
  }
  
sign(): void {
  this.error.set('');
  this.info.set('');

  if (!this.verified()) {
    this.error.set(
      'Debes verificar tu correo antes de firmar.'
    );
    return;
  }

  if (!this.pdfUrl()) {
    this.error.set(
      'El documento PDF no está disponible.'
    );
    return;
  }

  if (!this.signerName.trim()) {
    this.error.set(
      'Introduce el nombre del firmante.'
    );
    return;
  }

  if (!this.hasInk()) {
    this.error.set(
      'Debes dibujar tu firma.'
    );
    return;
  }

  if (!this.consent) {
    this.error.set(
      'Debes aceptar el consentimiento.'
    );
    return;
  }

  const canvas = this.canvas?.nativeElement;

  if (!canvas) {
    this.error.set(
      'No se encontró el área de firma.'
    );
    return;
  }

  let signatureData: string;

  try {
    signatureData = canvas.toDataURL('image/png');
  } catch {
    this.error.set(
      'No fue posible generar la imagen de firma.'
    );
    return;
  }

  if (
    !signatureData.startsWith(
      'data:image/png;base64,'
    )
  ) {
    this.error.set(
      'El formato de imagen generado no es válido.'
    );
    return;
  }

  console.log(
    'Firma PNG generada. Longitud:',
    signatureData.length
  );

  this.busy.set(true);

  this.api.sign(
    this.token,
    this.signerName.trim(),
    signatureData,
    true
  ).subscribe({
    next: () => {
  this.busy.set(false);
  this.finished.set(true);

  this.invitation.update(invitation =>
    invitation
      ? { ...invitation, status: 'signed' }
      : invitation
  );

  this.info.set('Firma registrada correctamente.');
},
    error: err => {
      this.setError(
        err,
        'No se pudo registrar la firma.'
      );
    },
  });
}

}
