"use client";

import { useState, KeyboardEvent } from "react";
import { X, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Teacher } from "@/types/schedule";

interface TeacherTagInputProps {
    value: Teacher[];
    onChange: (teachers: Teacher[]) => void;
    placeholder?: string;
    maxTags?: number;
    availableClasses: string[]; // ["1-1", "1-2", ...]
    departmentId: string;
    className?: string;
}

export function TeacherTagInput({
    value,
    onChange,
    placeholder,
    maxTags,
    availableClasses,
    departmentId,
    className
}: TeacherTagInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault();
            if (maxTags && value.length >= maxTags) return;

            const newTeacher: Teacher = {
                id: `${departmentId}-${Date.now()}`,
                name: inputValue.trim(),
                subjectId: departmentId,
            };

            if (!value.find(t => t.name === newTeacher.name)) {
                onChange([...value, newTeacher]);
            }
            setInputValue("");
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const removeTeacher = (teacherId: string) => {
        onChange(value.filter(t => t.id !== teacherId));
    };

    const updateTeacher = (teacher: Teacher) => {
        onChange(value.map(t => t.id === teacher.id ? teacher : t));
    };

    return (
        <div className={cn("flex flex-wrap gap-2 p-2 border rounded-md", className)}>
            {value.map((teacher) => (
                <Popover key={teacher.id}>
                    <PopoverTrigger asChild>
                        <Badge variant="secondary" className="gap-1 cursor-pointer hover:bg-gray-200">
                            {teacher.name}
                            {teacher.homeroomClass && <span className="text-xs">({teacher.homeroomClass})</span>}
                            <Settings className="w-3 h-3" />
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeTeacher(teacher.id);
                                }}
                                className="hover:bg-gray-300 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                        <div className="space-y-4">
                            <h4 className="font-medium">{teacher.name} 역할 설정</h4>

                            <div className="space-y-2">
                                <Label>담임 반</Label>
                                <Select
                                    value={teacher.homeroomClass || ""}
                                    onValueChange={(value) => updateTeacher({ ...teacher, homeroomClass: value || undefined })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="담임 반 선택 (선택사항)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">없음</SelectItem>
                                        {availableClasses.map(cls => (
                                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`assistant-${teacher.id}`}
                                    checked={teacher.isAssistantHomeroom || false}
                                    onCheckedChange={(checked) => updateTeacher({ ...teacher, isAssistantHomeroom: checked as boolean })}
                                />
                                <Label htmlFor={`assistant-${teacher.id}`}>부담임</Label>
                            </div>

                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id={`head-${teacher.id}`}
                                    checked={teacher.isDepartmentHead || false}
                                    onCheckedChange={(checked) => updateTeacher({ ...teacher, isDepartmentHead: checked as boolean })}
                                />
                                <Label htmlFor={`head-${teacher.id}`}>교과 부장</Label>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            ))}
            <Input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                    maxTags
                        ? `${placeholder} (${value.length}/${maxTags})`
                        : placeholder
                }
                className="flex-1 border-none shadow-none focus-visible:ring-0 min-w-[120px]"
                disabled={maxTags ? value.length >= maxTags : false}
            />
        </div>
    );
}
