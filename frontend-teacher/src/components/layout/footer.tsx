export default function Footer() {
  return (
    <footer className="bg-godding-primary-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30">
                <span className="text-white font-bold text-lg">고</span>
              </div>
              <div>
                <span className="text-xl font-bold text-white">고딩픽 교사용</span>
                <p className="text-xs text-white/80">교사들을 위한 통합 관리 플랫폼</p>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">
              고교학점제 도입에 따른 교사들을 위한 통합 관리 플랫폼입니다.
              <br />
              학생 세특 작성부터 과목 수요 조사까지 모든 것을 한 곳에서 관리하세요.
            </p>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">주요 기능</h3>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="hover:text-white transition-colors cursor-pointer">세특 작성 도구</li>
              <li className="hover:text-white transition-colors cursor-pointer">과목 수요 조사</li>
              <li className="hover:text-white transition-colors cursor-pointer">정독실 관리</li>
              <li className="hover:text-white transition-colors cursor-pointer">야자 출석 체크</li>
              <li className="hover:text-white transition-colors cursor-pointer">세특 검열 시스템</li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">지원</h3>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="hover:text-white transition-colors cursor-pointer">사용 가이드</li>
              <li className="hover:text-white transition-colors cursor-pointer">FAQ</li>
              <li className="hover:text-white transition-colors cursor-pointer">문의하기</li>
              <li className="hover:text-white transition-colors cursor-pointer">업데이트 로그</li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-center text-sm text-white/70">
            © 2024 고딩픽 교사용 플랫폼. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
