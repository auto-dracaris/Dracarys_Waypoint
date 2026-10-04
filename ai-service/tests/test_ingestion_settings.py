import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_ingestion_parameters_are_loaded_from_env_file(tmp_path):
    configuration = tmp_path / ".env"
    configuration.write_text(
        "AI_EMBEDDING_DIMENSIONS=512\nAI_CHUNK_SIZE=800\nAI_CHUNK_OVERLAP=80\n",
        encoding="utf-8",
    )
    settings = Settings(_env_file=configuration)
    assert settings.embedding_dimensions == 512
    assert settings.chunk_size == 800
    assert settings.chunk_overlap == 80


@pytest.mark.parametrize(
    "values",
    [
        {"chunk_size": 99},
        {"chunk_size": 4001},
        {"chunk_overlap": -1},
        {"chunk_size": 800, "chunk_overlap": 400},
        {"embedding_dimensions": 0},
    ],
)
def test_invalid_ingestion_parameters_fail_at_configuration(values):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **values)
