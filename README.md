# Notion-to-Markdown
Notion Database안에 들어있는 Page들을 Markdown 파일로 변환하는 것을 목표로 합니다. 

## 갑자기 짚고 넘어가는 프로젝트의 목표

이번 프로젝트의 목표는 다음과 같습니다.

### 개발 내적인 목표

1. 타입스크립트를 사용한다. 
2. 변경에는 닫혀있고, 확장에는 열린 코드를 작성한다. 
3. 이를 위해 구현에만 집중하지 않고 설계에 신경을 써서 진행해본다.
4. 이를 위해 디자인 패턴을 가능한 한 적극적으로 활용해본다. 
5. 가능한 한 사용이 쉽도록 만들어본다.

### 개발 외적인 목표

1. 노션으로 공부만 해도 포스팅/풀심기가 모두 되는 (개인적인)꿈의 프로그램을 만든다.
   
# 설정
### .env 설정
```bash
NOTION_KEY=<Notion API Secret Key>
NOTION_PAGE_ID=<Page ID>
```

[Notion API(1)](https://sharknia.vercel.app/notion-api-1)