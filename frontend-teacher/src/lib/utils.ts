import { type ClassValue, clsx } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * 문자열의 바이트 길이를 계산합니다 (UTF-8 인코딩 기준)
 * 한글은 3바이트, 영문/숫자/일부 특수문자는 1바이트
 */
export function getByteLength(str: string): number {
  return new Blob([str]).size
}

/**
 * 바이트 제한에 따른 글자 수를 추정합니다 (대략적인 추정)
 */
export function estimateCharLength(byteLimit: number): number {
  // 대략적으로 한글 위주라면 byteLimit / 3, 영문 위주라면 byteLimit
  // 평균적으로 byteLimit / 2 정도로 추정
  return Math.floor(byteLimit / 2)
}