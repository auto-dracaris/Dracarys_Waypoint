from evaluations.run import citation_ids, grade_chat


def test_unknown_citation_fails_even_if_expected_words_and_page_are_present():
    case = {"id": "cutoff", "pages": [4], "answer_any": ["4 pm"]}
    body = {
        "answer": "Close at 4 PM. [policy:invented]",
        "sources": [{"id": "policy:actual", "source_id": "reference", "page": 4}],
    }
    checks = grade_chat(case, 200, body, {"document_id": "reference"})
    assert checks["expected_page_retrieved"]
    assert not checks["citation_ids_valid"] and not checks["reference_cited"]


def test_reference_page_must_belong_to_expected_document():
    body = {
        "answer": "Rule [policy:other]",
        "sources": [{"id": "policy:other", "source_id": "other", "page": 4}],
    }
    checks = grade_chat({"id": "cutoff", "pages": [4]}, 200, body, {"document_id": "reference"})
    assert not checks["expected_page_retrieved"]


def test_live_status_requires_actual_record_and_an_api_citation():
    body = {"answer": "Order confirmed [policy:terms]", "sources": [{"id": "policy:terms"}]}
    checks = grade_chat(
        {"id": "record", "require_api": True}, 200, body, {}, {"status": "confirmed"}
    )
    assert checks["actual_status_present"] and not checks["api_cited"]


def test_multiple_citations_and_clock_ids_are_parsed():
    assert citation_ids("Facts [api:orders:1, policy:a] and [runtime:datetime]") == {
        "api:orders:1",
        "policy:a",
        "runtime:datetime",
    }


def test_write_request_cannot_pass_using_unrelated_document_refusal_words():
    case = {"id": "driver-no-write", "answer_any": ["not enabled"]}
    body = {
        "status": "sources_only",
        "answer": "Vehicles not enabled for chilled loads.",
        "sources": [{"id": "policy:a"}],
    }
    assert not grade_chat(case, 200, body, {})["explicit_unsupported_action"]
