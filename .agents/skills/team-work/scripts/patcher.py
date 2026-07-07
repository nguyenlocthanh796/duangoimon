import re
from pathlib import Path

class CodePatcher:
    @staticmethod
    def apply_patch(original_code: str, agent_response: str) -> tuple[bool, str, str]:
        """
        Applies SEARCH/REPLACE or CREATE patches.
        Returns: (success, new_code_or_original, detail_message)
        """
        # 1. Handle CREATE block (new file)
        create_pattern = r"<<<< CREATE .+?\n(.*?)\n>>>> END CREATE"
        create_match = re.search(create_pattern, agent_response, re.DOTALL)
        if create_match:
            return True, create_match.group(1), "SUCCESS: new file created"

        # 2. Handle SEARCH/REPLACE blocks (modify existing)
        pattern = r"<<<< SEARCH\n(.*?)\n====\n(.*?)\n>>>> REPLACE"
        matches = list(re.finditer(pattern, agent_response, re.DOTALL))

        if not matches:
            if "UNCLEAR:" in agent_response:
                reason = agent_response.split("UNCLEAR:", 1)[1].strip()[:200]
                return False, original_code, f"UNCLEAR: {reason}"
            return False, original_code, "ERROR: No <<<< SEARCH ... ==== ... >>>> REPLACE blocks found."

        new_code = original_code
        for match in matches:
            search_block = match.group(1)
            replace_block = match.group(2)

            if search_block not in new_code:
                error_msg = (
                    f"ERROR: SEARCH block not found in original file.\n"
                    f"Check exact whitespace and indentation.\n"
                    f"AI searched for:\n---\n{search_block}\n---"
                )
                return False, original_code, error_msg

            new_code = new_code.replace(search_block, replace_block, 1)

        return True, new_code, "SUCCESS"

    @staticmethod
    def write_result(file_path: str, new_content: str, action: str):
        path = Path(file_path)
        if action == "create":
            path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(new_content, encoding="utf-8")
