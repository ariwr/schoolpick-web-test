'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface LoginRequiredModalProps {
  isOpen: boolean
  onConfirm: () => void
  onCancel?: () => void
}

/**
 * 로그인 필요 모달 컴포넌트
 * 최적화: GPU 가속을 사용하여 빠른 렌더링
 */
export default function LoginRequiredModal({ isOpen, onConfirm, onCancel }: LoginRequiredModalProps) {
  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      style={{ willChange: 'opacity' }} // GPU 가속
      onClick={(e) => {
        // 배경 클릭 시 아무 동작도 하지 않음 (모달이 닫히지 않도록)
        e.stopPropagation()
      }}
    >
      <Card 
        className="w-full max-w-md bg-white shadow-xl"
        style={{ willChange: 'transform' }} // GPU 가속
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-godding-primary/10 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-godding-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-godding-text-primary">
            로그인이 필요합니다
          </CardTitle>
          <CardDescription className="text-base mt-2 text-godding-text-secondary">
            스쿨픽 교사용을 사용하시려면 로그인이 필요합니다.
            <br />
            로그인 창으로 이동할까요?
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 justify-center">
          {onCancel && (
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              취소
            </Button>
          )}
          <Button
            onClick={onConfirm}
            className="flex-1 bg-godding-primary hover:bg-godding-primary-dark text-white"
          >
            로그인하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

