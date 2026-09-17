--
-- PostgreSQL database dump
--

\restrict QKYJnGn5TX8CVVfxB6en9LI1QSKrxqsEjOSSriWhPMQWFmIMnbNp1DmdgPtvZWg

-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.4

-- Started on 2026-09-17 15:19:46

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 24671)
-- Name: checklist; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.checklist (
    id_checklist integer NOT NULL,
    titulo character varying(150) NOT NULL,
    ativo boolean DEFAULT true,
    data_criacao timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    versao integer DEFAULT 1,
    id_checklist_origem integer,
    id_setor integer,
    tipo_agendamento character varying(50) DEFAULT 'INTERVALO_DIAS'::character varying,
    intervalo_dias integer,
    data_especifica date
);


ALTER TABLE public.checklist OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 24679)
-- Name: checklist_id_checklist_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.checklist_id_checklist_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.checklist_id_checklist_seq OWNER TO postgres;

--
-- TOC entry 5047 (class 0 OID 0)
-- Dependencies: 220
-- Name: checklist_id_checklist_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.checklist_id_checklist_seq OWNED BY public.checklist.id_checklist;


--
-- TOC entry 221 (class 1259 OID 24680)
-- Name: execucao; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.execucao (
    id_execucao integer NOT NULL,
    id_checklist integer NOT NULL,
    id_usuario integer NOT NULL,
    status character varying(50) DEFAULT 'EM_ANDAMENTO'::character varying,
    data_inicio timestamp without time zone,
    data_conclusao timestamp without time zone,
    ordem_servico character varying(50),
    status_nc character varying(20) DEFAULT 'SEM_NC'::character varying,
    id_admin_resolucao integer,
    data_resolucao timestamp without time zone,
    observacao_resolucao text
);


ALTER TABLE public.execucao OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 24690)
-- Name: execucao_id_execucao_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.execucao_id_execucao_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.execucao_id_execucao_seq OWNER TO postgres;

--
-- TOC entry 5048 (class 0 OID 0)
-- Dependencies: 222
-- Name: execucao_id_execucao_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.execucao_id_execucao_seq OWNED BY public.execucao.id_execucao;


--
-- TOC entry 223 (class 1259 OID 24691)
-- Name: item; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.item (
    id_item integer NOT NULL,
    id_checklist integer NOT NULL,
    ordem integer NOT NULL,
    descricao text NOT NULL,
    tipo character varying(50) NOT NULL,
    obrigatorio boolean DEFAULT true,
    imagem_referencia character varying(255),
    etapa character varying(100) DEFAULT 'Inspeção Geral'::character varying,
    ordem_etapa integer DEFAULT 1
);


ALTER TABLE public.item OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 24702)
-- Name: item_id_item_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.item_id_item_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.item_id_item_seq OWNER TO postgres;

--
-- TOC entry 5049 (class 0 OID 0)
-- Dependencies: 224
-- Name: item_id_item_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.item_id_item_seq OWNED BY public.item.id_item;


--
-- TOC entry 225 (class 1259 OID 24703)
-- Name: log_auditoria; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_auditoria (
    id_log integer NOT NULL,
    id_usuario integer NOT NULL,
    acao character varying(50) NOT NULL,
    tabela_afetada character varying(50) NOT NULL,
    id_registro integer NOT NULL,
    dados_antigos jsonb,
    dados_novos jsonb,
    data_acao timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.log_auditoria OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 24714)
-- Name: log_auditoria_id_log_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.log_auditoria_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.log_auditoria_id_log_seq OWNER TO postgres;

--
-- TOC entry 5050 (class 0 OID 0)
-- Dependencies: 226
-- Name: log_auditoria_id_log_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.log_auditoria_id_log_seq OWNED BY public.log_auditoria.id_log;


--
-- TOC entry 227 (class 1259 OID 24715)
-- Name: resposta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.resposta (
    id_resposta integer NOT NULL,
    id_execucao integer NOT NULL,
    id_item integer NOT NULL,
    valor_resposta text,
    observacao text,
    imagem_evidencia character varying(255)
);


ALTER TABLE public.resposta OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 24723)
-- Name: resposta_id_resposta_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.resposta_id_resposta_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.resposta_id_resposta_seq OWNER TO postgres;

--
-- TOC entry 5051 (class 0 OID 0)
-- Dependencies: 228
-- Name: resposta_id_resposta_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.resposta_id_resposta_seq OWNED BY public.resposta.id_resposta;


--
-- TOC entry 229 (class 1259 OID 24724)
-- Name: setor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.setor (
    id_setor integer NOT NULL,
    nome character varying(100) NOT NULL,
    id_setor_pai integer
);


ALTER TABLE public.setor OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 24729)
-- Name: setor_id_setor_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.setor_id_setor_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.setor_id_setor_seq OWNER TO postgres;

--
-- TOC entry 5052 (class 0 OID 0)
-- Dependencies: 230
-- Name: setor_id_setor_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.setor_id_setor_seq OWNED BY public.setor.id_setor;


--
-- TOC entry 231 (class 1259 OID 24730)
-- Name: usuario; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario (
    id_usuario integer NOT NULL,
    nome character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    data_cadastro timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    senha character varying(255) NOT NULL,
    forcar_troca_senha boolean DEFAULT false,
    ativo boolean DEFAULT true
);


ALTER TABLE public.usuario OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 24742)
-- Name: usuario_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.usuario_id_usuario_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.usuario_id_usuario_seq OWNER TO postgres;

--
-- TOC entry 5053 (class 0 OID 0)
-- Dependencies: 232
-- Name: usuario_id_usuario_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.usuario_id_usuario_seq OWNED BY public.usuario.id_usuario;


--
-- TOC entry 233 (class 1259 OID 24743)
-- Name: usuario_setor; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usuario_setor (
    id_usuario integer NOT NULL,
    id_setor integer NOT NULL
);


ALTER TABLE public.usuario_setor OWNER TO postgres;

--
-- TOC entry 4843 (class 2604 OID 24748)
-- Name: checklist id_checklist; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist ALTER COLUMN id_checklist SET DEFAULT nextval('public.checklist_id_checklist_seq'::regclass);


--
-- TOC entry 4848 (class 2604 OID 24749)
-- Name: execucao id_execucao; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao ALTER COLUMN id_execucao SET DEFAULT nextval('public.execucao_id_execucao_seq'::regclass);


--
-- TOC entry 4851 (class 2604 OID 24750)
-- Name: item id_item; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item ALTER COLUMN id_item SET DEFAULT nextval('public.item_id_item_seq'::regclass);


--
-- TOC entry 4855 (class 2604 OID 24751)
-- Name: log_auditoria id_log; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_auditoria ALTER COLUMN id_log SET DEFAULT nextval('public.log_auditoria_id_log_seq'::regclass);


--
-- TOC entry 4857 (class 2604 OID 24752)
-- Name: resposta id_resposta; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta ALTER COLUMN id_resposta SET DEFAULT nextval('public.resposta_id_resposta_seq'::regclass);


--
-- TOC entry 4858 (class 2604 OID 24753)
-- Name: setor id_setor; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setor ALTER COLUMN id_setor SET DEFAULT nextval('public.setor_id_setor_seq'::regclass);


--
-- TOC entry 4859 (class 2604 OID 24754)
-- Name: usuario id_usuario; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario ALTER COLUMN id_usuario SET DEFAULT nextval('public.usuario_id_usuario_seq'::regclass);


--
-- TOC entry 4864 (class 2606 OID 24756)
-- Name: checklist checklist_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_pkey PRIMARY KEY (id_checklist);


--
-- TOC entry 4866 (class 2606 OID 24758)
-- Name: execucao execucao_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao
    ADD CONSTRAINT execucao_pkey PRIMARY KEY (id_execucao);


--
-- TOC entry 4868 (class 2606 OID 24760)
-- Name: item item_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT item_pkey PRIMARY KEY (id_item);


--
-- TOC entry 4870 (class 2606 OID 24762)
-- Name: log_auditoria log_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_auditoria
    ADD CONSTRAINT log_auditoria_pkey PRIMARY KEY (id_log);


--
-- TOC entry 4872 (class 2606 OID 24764)
-- Name: resposta resposta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT resposta_pkey PRIMARY KEY (id_resposta);


--
-- TOC entry 4876 (class 2606 OID 24766)
-- Name: setor setor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setor
    ADD CONSTRAINT setor_pkey PRIMARY KEY (id_setor);


--
-- TOC entry 4874 (class 2606 OID 24768)
-- Name: resposta uk_execucao_item; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT uk_execucao_item UNIQUE (id_execucao, id_item);


--
-- TOC entry 4878 (class 2606 OID 24770)
-- Name: usuario usuario_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_email_key UNIQUE (email);


--
-- TOC entry 4880 (class 2606 OID 24772)
-- Name: usuario usuario_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario
    ADD CONSTRAINT usuario_pkey PRIMARY KEY (id_usuario);


--
-- TOC entry 4882 (class 2606 OID 24774)
-- Name: usuario_setor usuario_setor_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_setor
    ADD CONSTRAINT usuario_setor_pkey PRIMARY KEY (id_usuario, id_setor);


--
-- TOC entry 4883 (class 2606 OID 24775)
-- Name: checklist checklist_id_setor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT checklist_id_setor_fkey FOREIGN KEY (id_setor) REFERENCES public.setor(id_setor) ON DELETE RESTRICT;


--
-- TOC entry 4885 (class 2606 OID 24780)
-- Name: execucao execucao_id_admin_resolucao_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao
    ADD CONSTRAINT execucao_id_admin_resolucao_fkey FOREIGN KEY (id_admin_resolucao) REFERENCES public.usuario(id_usuario);


--
-- TOC entry 4884 (class 2606 OID 24785)
-- Name: checklist fk_checklist_origem; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.checklist
    ADD CONSTRAINT fk_checklist_origem FOREIGN KEY (id_checklist_origem) REFERENCES public.checklist(id_checklist) ON DELETE SET NULL;


--
-- TOC entry 4886 (class 2606 OID 24790)
-- Name: execucao fk_execucao_checklist; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao
    ADD CONSTRAINT fk_execucao_checklist FOREIGN KEY (id_checklist) REFERENCES public.checklist(id_checklist) ON DELETE RESTRICT;


--
-- TOC entry 4887 (class 2606 OID 24795)
-- Name: execucao fk_execucao_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.execucao
    ADD CONSTRAINT fk_execucao_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE RESTRICT;


--
-- TOC entry 4888 (class 2606 OID 24800)
-- Name: item fk_item_checklist; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.item
    ADD CONSTRAINT fk_item_checklist FOREIGN KEY (id_checklist) REFERENCES public.checklist(id_checklist) ON DELETE CASCADE;


--
-- TOC entry 4889 (class 2606 OID 24805)
-- Name: log_auditoria fk_log_usuario; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_auditoria
    ADD CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE RESTRICT;


--
-- TOC entry 4890 (class 2606 OID 24810)
-- Name: resposta fk_resposta_execucao; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT fk_resposta_execucao FOREIGN KEY (id_execucao) REFERENCES public.execucao(id_execucao) ON DELETE CASCADE;


--
-- TOC entry 4891 (class 2606 OID 24815)
-- Name: resposta fk_resposta_item; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.resposta
    ADD CONSTRAINT fk_resposta_item FOREIGN KEY (id_item) REFERENCES public.item(id_item) ON DELETE RESTRICT;


--
-- TOC entry 4892 (class 2606 OID 24820)
-- Name: setor setor_id_setor_pai_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.setor
    ADD CONSTRAINT setor_id_setor_pai_fkey FOREIGN KEY (id_setor_pai) REFERENCES public.setor(id_setor) ON DELETE CASCADE;


--
-- TOC entry 4893 (class 2606 OID 24825)
-- Name: usuario_setor usuario_setor_id_setor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_setor
    ADD CONSTRAINT usuario_setor_id_setor_fkey FOREIGN KEY (id_setor) REFERENCES public.setor(id_setor) ON DELETE CASCADE;


--
-- TOC entry 4894 (class 2606 OID 24830)
-- Name: usuario_setor usuario_setor_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usuario_setor
    ADD CONSTRAINT usuario_setor_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuario(id_usuario) ON DELETE CASCADE;


-- Completed on 2026-09-17 15:19:47

--
-- PostgreSQL database dump complete
--

\unrestrict QKYJnGn5TX8CVVfxB6en9LI1QSKrxqsEjOSSriWhPMQWFmIMnbNp1DmdgPtvZWg

