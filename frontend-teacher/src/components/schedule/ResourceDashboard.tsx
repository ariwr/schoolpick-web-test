"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserIcon, BuildingLibraryIcon, AcademicCapIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ResourceDashboardProps {
    day: string;
    period: number;
    targetName: string; // "1-1" or "Kim Teacher"
    onClose: () => void;
}

export default function ResourceDashboard({ day, period, targetName, onClose }: ResourceDashboardProps) {
    return (
        <Card className="h-full border-l border-gray-200 rounded-none shadow-xl bg-white w-80 animate-in slide-in-from-right duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100">
                <div>
                    <CardTitle className="text-lg font-bold text-gray-800">
                        {targetName} - {period}교시
                    </CardTitle>
                    <CardDescription>
                        {day}요일 자원 현황
                    </CardDescription>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                    <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
            </CardHeader>
            <CardContent className="space-y-6 pt-6 overflow-y-auto max-h-[calc(100vh-200px)]">
                {/* Available Teachers */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <UserIcon className="w-4 h-4 mr-2 text-blue-500" />
                        가용 교사 현황
                    </h3>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm p-2 bg-blue-50 rounded-lg">
                            <span className="text-gray-600">국어과</span>
                            <Badge variant="secondary" className="bg-white text-blue-600">2/4명 가능</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-lg">
                            <span className="text-gray-600">수학과</span>
                            <Badge variant="secondary" className="bg-white text-gray-500">0/4명 (전원 수업)</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm p-2 bg-green-50 rounded-lg">
                            <span className="text-gray-600">영어과</span>
                            <Badge variant="secondary" className="bg-white text-green-600">1/3명 가능</Badge>
                        </div>
                    </div>
                </div>

                {/* Special Rooms */}
                <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                        <BuildingLibraryIcon className="w-4 h-4 mr-2 text-purple-500" />
                        특별실 사용 현황
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="p-2 border border-gray-200 rounded text-center">
                            <div className="text-xs text-gray-500">음악실</div>
                            <div className="text-sm font-bold text-red-500">사용 중</div>
                        </div>
                        <div className="p-2 border border-gray-200 rounded text-center bg-gray-50">
                            <div className="text-xs text-gray-500">미술실</div>
                            <div className="text-sm font-bold text-green-600">사용 가능</div>
                        </div>
                        <div className="p-2 border border-gray-200 rounded text-center bg-gray-50">
                            <div className="text-xs text-gray-500">과학실1</div>
                            <div className="text-sm font-bold text-green-600">사용 가능</div>
                        </div>
                        <div className="p-2 border border-gray-200 rounded bg-gray-100 opacity-50 text-center">
                            <div className="text-xs text-gray-500">컴퓨터실</div>
                            <div className="text-sm font-bold text-gray-400">공사 중</div>
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <h4 className="text-xs font-bold text-yellow-700 mb-2 flex items-center">
                        <AcademicCapIcon className="w-3 h-3 mr-1" />
                        AI 추천
                    </h4>
                    <p className="text-xs text-yellow-800 leading-relaxed">
                        현재 1학년 창체 활동이 집중되어 있습니다. 이수학 선생님은 3교시가 공강이므로 창체 지도가 가능합니다.
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
