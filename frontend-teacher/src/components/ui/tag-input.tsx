"use client";

import { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
    value: string[];
    onChange: (tags: string[]) => void;
    placeholder?: string;
    maxTags?: number;
    className?: string;
}

export function TagInput({ value, onChange, placeholder, maxTags, className }: TagInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && inputValue.trim()) {
            e.preventDefault();
            if (maxTags && value.length >= maxTags) return;

            if (!value.includes(inputValue.trim())) {
                onChange([...value, inputValue.trim()]);
            }
            setInputValue("");
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(tag => tag !== tagToRemove));
    };

    return (
        <div className={cn("flex flex-wrap gap-2 p-2 border rounded-md", className)}>
            {value.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:bg-gray-200 rounded-full p-0.5"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </Badge>
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
