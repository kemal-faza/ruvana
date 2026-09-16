import { NextResponse } from "next/server";

export interface ProblemFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ProblemOptions {
  status: number;
  code: string;
  title: string;
  detail: string;
  instance: string;
  errors?: ProblemFieldError[];
}

function toProblemType(code: string): string {
  const kebab = code.toLowerCase().replaceAll("_", "-");
  return `https://ruvana.invalid/problems/${kebab}`;
}

export function problemResponse({ status, code, title, detail, instance, errors }: ProblemOptions) {
  return NextResponse.json(
    {
      type: toProblemType(code),
      title,
      status,
      detail,
      instance,
      code,
      ...(errors ? { errors } : {}),
    },
    {
      status,
      headers: {
        "Content-Type": "application/problem+json",
        "Cache-Control": "no-store",
      },
    },
  );
}

export function badRequest(instance: string, detail = "Permintaan tidak valid") {
  return problemResponse({
    status: 400,
    code: "BAD_REQUEST",
    title: "Permintaan tidak valid",
    detail,
    instance,
  });
}

export function notFound(instance: string, detail = "Resource tidak ditemukan") {
  return problemResponse({
    status: 404,
    code: "NOT_FOUND",
    title: "Resource tidak ditemukan",
    detail,
    instance,
  });
}

export function validationFailed(instance: string, errors: ProblemFieldError[]) {
  return problemResponse({
    status: 422,
    code: "VALIDATION_FAILED",
    title: "Validasi gagal",
    detail: "Satu atau lebih field tidak memenuhi aturan validasi",
    instance,
    errors,
  });
}

export function internalError(instance: string) {
  return problemResponse({
    status: 500,
    code: "INTERNAL_ERROR",
    title: "Kesalahan internal",
    detail: "Terjadi kesalahan yang tidak terduga, silakan coba lagi",
    instance,
  });
}
