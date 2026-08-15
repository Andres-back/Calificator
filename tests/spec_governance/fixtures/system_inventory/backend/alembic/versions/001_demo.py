def upgrade():
    op.create_table("demos")
    op.create_table("legacy_demos")