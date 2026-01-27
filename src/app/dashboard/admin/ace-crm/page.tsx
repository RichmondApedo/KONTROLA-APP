'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type TicketStatus = 'Open' | 'In Progress' | 'Resolved';

type SupportTicket = {
  id: string;
  userEmail: string;
  subject: string;
  message: string;
  status: TicketStatus;
  createdAt: Date;
};

const placeholderTickets: SupportTicket[] = [
  {
    id: 'TICKET-001',
    userEmail: 'jane.doe@example.com',
    subject: 'Issue with bill tracking',
    message: 'Hello, my recurring bill for Netflix was not marked as paid automatically this month. Can you please check what happened? Thanks!',
    status: 'Open',
    createdAt: new Date('2024-07-20T10:00:00Z'),
  },
  {
    id: 'TICKET-002',
    userEmail: 'john.smith@example.com',
    subject: 'Cannot connect my bank account',
    message: 'I am trying to connect my bank account but I keep getting an error message. I have tried multiple times. My bank is "Ghana Commercial Bank".',
    status: 'In Progress',
    createdAt: new Date('2024-07-19T14:30:00Z'),
  },
  {
    id: 'TICKET-003',
    userEmail: 'emily.jones@example.com',
    subject: 'Question about Pro Plus plan',
    message: 'Does the Pro Plus plan include 1-on-1 money coaching sessions every month or is it a one-time thing?',
    status: 'Resolved',
    createdAt: new Date('2024-07-18T09:00:00Z'),
  },
  {
    id: 'TICKET-004',
    userEmail: 'michael.brown@example.com',
    subject: 'Feedback on the new UI',
    message: 'Just wanted to say the new responsive design is great! The cards on mobile for expenses are much easier to read. Keep up the good work!',
    status: 'Resolved',
    createdAt: new Date('2024-07-21T11:00:00Z'),
  },
];


export default function AceCrmPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>(placeholderTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(tickets[0] || null);

  const updateTicketStatus = (ticketId: string, newStatus: TicketStatus) => {
    setTickets(currentTickets =>
      currentTickets.map(ticket =>
        ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
      )
    );
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const getStatusColor = (status: TicketStatus) => {
    switch (status) {
      case 'Open': return 'bg-red-500';
      case 'In Progress': return 'bg-yellow-500';
      case 'Resolved': return 'bg-green-500';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-headline tracking-tight">ACE.CRM</h1>
        <p className="text-muted-foreground">Customer Relationship Management Dashboard.</p>
        <p className="text-sm text-amber-600 mt-2">This is a prototype using placeholder data. Interactions here do not affect real user data.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Tickets List */}
        <Card className="md:col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Customer Issues</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto flex-1">
            <div className="flex flex-col gap-2">
              {tickets.map(ticket => (
                <button
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors',
                    selectedTicket?.id === ticket.id ? 'bg-accent border-primary' : 'hover:bg-accent/50'
                  )}
                >
                  <div className="flex justify-between items-start">
                    <p className="font-semibold truncate pr-2">{ticket.subject}</p>
                    <span className={cn("h-3 w-3 rounded-full shrink-0 mt-1", getStatusColor(ticket.status))}></span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{ticket.userEmail}</p>
                  <p className="text-xs text-muted-foreground">{format(ticket.createdAt, 'PPp')}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Ticket Details */}
        <Card className="md:col-span-2 flex flex-col">
          <CardHeader>
            <CardTitle className="truncate">
                {selectedTicket ? selectedTicket.subject : 'Select a ticket'}
            </CardTitle>
            {selectedTicket && (
                <CardDescription className="flex items-center gap-2">
                    <span>{selectedTicket.userEmail}</span>
                    <Badge variant="outline">{selectedTicket.status}</Badge>
                </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            <div className="flex-1">
              <label htmlFor="ticket-message" className="text-sm font-medium text-muted-foreground">
                Customer Message
              </label>
              <Textarea
                id="ticket-message"
                readOnly
                value={selectedTicket ? selectedTicket.message : 'No ticket selected.'}
                className="h-full mt-2 bg-secondary/50 font-mono text-sm"
                style={{ fontFamily: 'monospace' }} // Inline style for notepad feel
              />
            </div>
            {selectedTicket && (
              <div className="flex flex-wrap gap-2 pt-4 border-t">
                <Button 
                    onClick={() => updateTicketStatus(selectedTicket.id, 'In Progress')}
                    disabled={selectedTicket.status === 'In Progress'}
                >
                    Mark as In Progress
                </Button>
                <Button 
                    onClick={() => updateTicketStatus(selectedTicket.id, 'Resolved')}
                    disabled={selectedTicket.status === 'Resolved'}
                    variant="default"
                >
                    Mark as Resolved
                </Button>
                 <Button 
                    onClick={() => updateTicketStatus(selectedTicket.id, 'Open')}
                    disabled={selectedTicket.status === 'Open'}
                    variant="outline"
                >
                    Re-Open
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
