-- Table definition matching Cloud Server PostgreSQL database
CREATE TABLE IF NOT EXISTS public.email_acknowledgements
(
    id SERIAL PRIMARY KEY,
    token character varying(128) NOT NULL,
    scheme_id character varying(50) NOT NULL,
    alert_type character varying(20) NOT NULL,
    engineer_email character varying(255) NOT NULL,
    engineer_name character varying(255),
    sent_date date NOT NULL DEFAULT CURRENT_DATE,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    alert_id integer,
    ticket_id character varying(100),
    esr_name character varying(255),
    is_ack boolean DEFAULT false
);

-- Recommended Indexes for performance on cloud
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_token ON public.email_acknowledgements(token);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_scheme ON public.email_acknowledgements(scheme_id, alert_type, sent_date);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_alert_id ON public.email_acknowledgements(alert_id);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_ticket_id ON public.email_acknowledgements(ticket_id);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_engineer ON public.email_acknowledgements(engineer_email);
CREATE INDEX IF NOT EXISTS idx_email_acknowledgements_sent_date ON public.email_acknowledgements(sent_date);
