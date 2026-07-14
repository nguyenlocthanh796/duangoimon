"""POSA - Standard input validation types.

Add Field constraints to ALL input schemas:
- Strings: max_length=255, min_length=1 (required)
- Money: Decimal, max_digits=10, decimal_places=2
- IDs: UUID validation
- Emails: EmailStr pattern
- Ints: ge/le bounds
"""
from decimal import Decimal


class MoneyAmount:
    """Money amount validator: max 99,999,999.99 VND"""
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_wrap_validator_function(
            cls.validate,
            core_schema.decimal_schema(max_digits=10, decimal_places=2),
        )
    
    @classmethod
    def validate(cls, value, handler):
        d = Decimal(str(value))
        if d < 0:
            raise ValueError("Money amount cannot be negative")
        if d > Decimal("99999999.99"):
            raise ValueError("Money amount too large")
        return d


class PhoneNumber:
    """Vietnamese phone number: 10 digits starting with 0."""
    @classmethod
    def __get_pydantic_core_schema__(cls, source_type, handler):
        from pydantic_core import core_schema
        return core_schema.no_info_wrap_validator_function(
            cls.validate,
            core_schema.str_schema(pattern=r'^0\d{9}$'),
        )
    
    @classmethod
    def validate(cls, value, handler):
        import re
        v = handler(value)
        if not re.match(r'^0\d{9}$', v):
            raise ValueError("Invalid phone number (must be 10 digits starting with 0)")
        return v
