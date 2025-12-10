from fastapi import APIRouter, UploadFile, File, HTTPException
import tempfile
import os
import shutil
from pdf2image import convert_from_path
import pytesseract
from PIL import Image, ImageEnhance
import cv2
import numpy as np
import time
import pdfplumber
import re

router = APIRouter()

# preprocess_image 함수 제거됨 (Tesseract 내부 전처리 사용)

@router.post("/extract")
def extract_text_from_pdf(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드 가능합니다.")
    
    start_time = time.time()
    
    # 임시 파일 생성 및 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_pdf:
        shutil.copyfileobj(file.file, temp_pdf)
        temp_pdf_path = temp_pdf.name

    try:
        extracted_text = ""
        is_digital_pdf = False
        
        # ... inside extract_text_from_pdf function ...

        # 1단계: pdfplumber를 이용한 텍스트 직접 추출 시도 (광학 인식 아님)
        try:
            with pdfplumber.open(temp_pdf_path) as pdf:
                plumber_text = ""
                for page in pdf.pages:
                    # layout=True는 시각적 여백을 공백 문자로 채우므로 제거
                    # 기본 extract_text()를 사용하여 자연스러운 텍스트 흐름 추출
                    page_text = page.extract_text()
                    if page_text:
                        plumber_text += page_text + "\n"
                
                # 유효한 텍스트가 일정량 이상이면 디지털 PDF로 판단
                if len(plumber_text.strip()) > 50:
                    # 스마트 공백 정리 (문단 보존 + 줄바꿈 해제)
                    # 1. 문단 분리 (\n\n+)
                    paragraphs = re.split(r'\n\s*\n', plumber_text)
                    cleaned_paragraphs = []
                    for para in paragraphs:
                        # 문단 내 줄바꿈 -> 공백
                        para = para.replace('\n', ' ')
                        # 다중 공백 정규화
                        para = re.sub(r'[ \t]+', ' ', para).strip()
                        if para:
                            cleaned_paragraphs.append(para)
                    
                    extracted_text = '\n\n'.join(cleaned_paragraphs)
                    
                    is_digital_pdf = True
                    print(f"Digital PDF Detected. Extracted with pdfplumber: {len(extracted_text)} chars")
        except Exception as e:
            print(f"pdfplumber extraction failed: {e}")
            # 실패하면 OCR로 넘어감

        # 2단계: 디지털 PDF가 아니거나 추출 실패 시 OCR 실행 (Fallback)
        if not is_digital_pdf:
            print("Scanned PDF or insufficient text detected. Falling back to OCR.")
            
            # PDF -> 이미지 변환 (DPI 300으로 조정 - 한글 인식률 향상)
            try:
                images = convert_from_path(temp_pdf_path, dpi=300)
                print(f"PDF 변환 완료: {len(images)} 페이지, {time.time() - start_time:.2f}초")
            except Exception as e:
                # pdf2image 관련 오류는 대부분 파일 문제이므로 400 반환
                print(f"PDF Conversion Error: {str(e)}")
                raise HTTPException(
                    status_code=400,
                    detail=f"PDF 파일 변환 실패. 올바른 PDF 파일인지 확인해주세요. ({str(e)})"
                )
            
            # Tesseract OCR 설정 (한글 최적화: PSM 6 - Single uniform block)
            # PSM 3(Auto)는 단순 문서에서 오인식 발생 가능성이 있어 PSM 6으로 변경
            custom_config = r'--oem 3 --psm 6'
            
            ocr_accumulated_text = ""
            
            # 각 이미지에서 텍스트 추출 (한글+영어)
            for idx, image in enumerate(images):
                page_start = time.time()
                
                # OCR 실행
                # 전처리: 흑백 변환(Grayscale)만 적용하여 노이즈 감소 (이진화는 제외하여 글자 획 보존)
                gray_image = image.convert('L')
                
                # 텍스트 추출 및 후처리 (오른쪽 공백 제거)
                text = pytesseract.image_to_string(
                    gray_image, 
                    lang='kor+eng',
                    config=custom_config
                )
                
                # 각 줄의 오른쪽 공백 제거 후 합치기
                ocr_accumulated_text += text + "\n"
                
                print(f"페이지 {idx + 1} 처리 완료: {time.time() - page_start:.2f}초")
            
            # OCR 결과도 동일하게 스마트 공백 정리
            paragraphs = re.split(r'\n\s*\n', ocr_accumulated_text)
            cleaned_paragraphs = []
            for para in paragraphs:
                para = para.replace('\n', ' ')
                para = re.sub(r'[ \t]+', ' ', para).strip()
                if para:
                    cleaned_paragraphs.append(para)
            
            extracted_text = '\n\n'.join(cleaned_paragraphs)
        
        total_time = time.time() - start_time
        print(f"전체 추출 완료 ({'Direct' if is_digital_pdf else 'OCR'}): {total_time:.2f}초")
            
        return {"text": extracted_text}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"OCR Error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"OCR 처리 중 오류 발생: {str(e)}")
    finally:
        # 임시 파일 삭제
        if os.path.exists(temp_pdf_path):
            os.remove(temp_pdf_path)
