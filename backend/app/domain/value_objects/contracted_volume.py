from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class ContractedVolume:
    """
    Immutable value object for contracted volume and pricing.

    Revenue is ALWAYS calculated from contracted impressions, never from
    delivered impressions. This is a critical invariant: revenue is booked
    when the contract is signed, not when the campaign runs.
    """

    contracted_impressions: int
    sale_cpm: Decimal

    def __post_init__(self):
        """Validate that CPM is Decimal, not float."""
        if not isinstance(self.sale_cpm, Decimal):
            raise TypeError(f"sale_cpm must be Decimal, not {type(self.sale_cpm)}")

    def revenue(self) -> Decimal:
        """
        Calculate revenue from contracted volume.

        Revenue = contracted_impressions * sale_cpm / 1000

        Returns Decimal rounded to 2 decimal places (EUR cents).
        """
        revenue = (
            Decimal(self.contracted_impressions) * self.sale_cpm / Decimal("1000")
        )
        return revenue.quantize(Decimal("0.01"))
