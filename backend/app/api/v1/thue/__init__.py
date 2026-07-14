"""Tax (thue) API package — re-exports for route registration."""
from app.api.v1.thue import (  # noqa
    _alias, bank, cash_register_invoice, declaration, legacy, profile, report,
)

# pyflakes: imports above are intentional re-exports (router discovery)
